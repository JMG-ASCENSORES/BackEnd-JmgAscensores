# Motor Determinista — Algoritmo Completo

El motor es la Capa 1 del sistema. No usa IA. Es puro código JavaScript/Node que produce una propuesta estructurada a partir de la demanda y los técnicos disponibles. Vive en `/BackEnd-JmgAscensores/src/services/ia-scheduler/motor.service.js`.

**Características clave**:
- Sin llamadas externas — corre en memoria con datos ya cargados.
- Determinista — el mismo input siempre produce el mismo output.
- Testeable en aislamiento con datos mock.
- Si falla, lanza excepción; nunca produce propuesta parcialmente inválida.

---

## Estructura del servicio

```javascript
// motor.service.js
class MotorService {
  constructor(districtTimesService, configService) {
    this.districtTimes = districtTimesService;
    this.config        = configService;
  }

  async generarPropuesta(workItems, tecnicos, fechaObjetivo) {
    // 1. Validar inputs
    // 2. Ordenar workItems por prioridad
    // 3. Asignar técnicos
    // 4. Secuenciar paradas por técnico
    // 5. Calcular horarios
    // 6. Detectar overflow
    // 7. Retornar PropostaMOTOR
  }
}
```

---

## Paso 1 — Validar inputs

```javascript
function validarInputs(workItems, tecnicos) {
  if (!workItems || workItems.length === 0) {
    throw new Error('No hay trabajos en el pool para la fecha seleccionada.');
  }
  if (!tecnicos || tecnicos.length === 0) {
    throw new Error('No hay técnicos seleccionados.');
  }
  // Verificar que todos los workItems tienen distrito válido
  const sinDistrito = workItems.filter(w => !w.distrito);
  if (sinDistrito.length > 0) {
    console.warn(`[Motor] ${sinDistrito.length} trabajos sin distrito — se usará fallback de 90 min.`);
  }
}
```

---

## Paso 2 — Ordenar workItems por prioridad

```javascript
function ordenarPorPrioridad(workItems) {
  return [...workItems].sort((a, b) => {
    // Prioridad ascendente (1=emergencia primero)
    if (a.prioridad !== b.prioridad) return a.prioridad - b.prioridad;
    
    // Si mismo tipo: primero los que tienen hora_preferida
    const aHora = a.hora_inicio_fija || a.hora_preferida || '99:99';
    const bHora = b.hora_inicio_fija || b.hora_preferida || '99:99';
    if (aHora !== bHora) return aHora.localeCompare(bHora);
    
    // Si mismo tipo y sin hora: agrupar por distrito
    return (a.distrito || '').localeCompare(b.distrito || '');
  });
}
```

---

## Paso 3 — Asignar técnicos (greedy balanceado)

### Elegibilidad por especialidad

```javascript
const ELEGIBILIDAD = {
  mantenimiento: ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico'],
  reparacion:    ['Técnico de Reparaciones', 'Supervisor Técnico'],
  inspeccion:    ['Supervisor Técnico', 'Técnico General'],
  emergencia:    ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico', 'Técnico de Reparaciones'],
};

function candidatosElegibles(workItem, tecnicos) {
  const especialidadesPermitidas = ELEGIBILIDAD[workItem.tipo_trabajo] || [];
  return tecnicos.filter(t => especialidadesPermitidas.includes(t.especialidad));
}
```

### Algoritmo de asignación

Para cada `workItem` (ya ordenados por prioridad):

1. Obtener candidatos elegibles.
2. Si ninguno es elegible → marcar como `sin_tecnico_elegible: true`, agregar al overflow.
3. Si hay técnico preferido (`tecnico_preferido_id`) entre los candidatos y tiene capacidad → asignarle.
4. Si no → elegir el candidato con **menor carga** (minutos comprometidos + trabajos ya asignados en esta ronda).
5. En caso de empate de carga → elegir el que ya tiene más trabajos en el mismo distrito (para favorecer clustering).

```javascript
function elegirTecnico(workItem, candidatos, asignaciones) {
  // Preferencia por técnico del plan fijo
  if (workItem.tecnico_preferido_id) {
    const preferido = candidatos.find(t => t.trabajador_id === workItem.tecnico_preferido_id);
    if (preferido && getCargaActual(preferido, asignaciones) < MAX_MINUTOS_DIA) {
      return preferido;
    }
  }

  // Greedy: menor carga, mejor cluster
  return candidatos
    .filter(t => getCargaActual(t, asignaciones) < MAX_MINUTOS_DIA)
    .sort((a, b) => {
      const cargaA = getCargaMinutos(a, asignaciones);
      const cargaB = getCargaMinutos(b, asignaciones);
      if (cargaA !== cargaB) return cargaA - cargaB;
      
      // Desempate: más trabajos en el mismo distrito
      const distA = countEnDistrito(a, workItem.distrito, asignaciones);
      const distB = countEnDistrito(b, workItem.distrito, asignaciones);
      return distB - distA; // más es mejor
    })[0] || null;
}

const MAX_MINUTOS_DIA = 10 * 60; // 10 horas absolutas de trabajo (incluyendo traslados)
```

---

## Paso 4 — Secuenciar paradas por técnico (nearest-neighbor)

Una vez asignados todos los trabajos, se ordena la secuencia de paradas de cada técnico para minimizar el tiempo total de traslado.

```javascript
function secuenciarParadas(trabajosDelTecnico, districtTimesService) {
  if (trabajosDelTecnico.length <= 1) return trabajosDelTecnico;
  
  // Separar: trabajos con hora_inicio_fija van en su slot exacto
  const fijos    = trabajosDelTecnico.filter(w => w.hora_inicio_fija !== null);
  const libres   = trabajosDelTecnico.filter(w => w.hora_inicio_fija === null);
  
  // Para los libres: nearest-neighbor greedy desde el punto de inicio (oficina JMG o primer fijo)
  const secuenciaLibres = nearestNeighbor(libres, districtTimesService);
  
  // Intercalar fijos en su posición temporal correcta
  return intercalarFijosEnSecuencia(secuenciaLibres, fijos);
}

function nearestNeighbor(trabajos, districtTimes) {
  if (trabajos.length === 0) return [];
  
  const pendientes = [...trabajos];
  const resultado  = [];
  let distritoActual = 'Cercado de Lima'; // punto de partida por defecto (puede configurarse)
  
  while (pendientes.length > 0) {
    // Encontrar el más cercano al distrito actual
    let minTiempo = Infinity;
    let elegidoIdx = 0;
    
    pendientes.forEach((trabajo, idx) => {
      const tiempo = districtTimes.getTiempo(distritoActual, trabajo.distrito);
      if (tiempo < minTiempo) {
        minTiempo  = tiempo;
        elegidoIdx = idx;
      }
    });
    
    resultado.push(pendientes[elegidoIdx]);
    distritoActual = pendientes[elegidoIdx].distrito;
    pendientes.splice(elegidoIdx, 1);
  }
  
  return resultado;
}
```

---

## Paso 5 — Calcular horarios

Para cada técnico, asignar `hora_inicio` y `hora_fin` a cada parada:

```javascript
function calcularHorarios(secuencia, cargaPreexistente, config) {
  const HORA_INICIO_JORNADA = config.hora_inicio_default || '08:30';
  const HORA_FIN_LIMITE     = config.hora_fin_limite     || '18:30';
  
  let tiempoActual = toMinutos(HORA_INICIO_JORNADA);
  const resultados = [];
  
  // Considerar carga preexistente del técnico para ese día
  // Si ya tiene Programaciones confirmadas antes del pool nuevo, empezar después de la última
  if (cargaPreexistente.ultima_hora_fin) {
    const ultimaFin = toMinutos(cargaPreexistente.ultima_hora_fin);
    tiempoActual = Math.max(tiempoActual, ultimaFin + 15); // 15 min de margen
  }
  
  for (let i = 0; i < secuencia.length; i++) {
    const trabajo = secuencia[i];
    
    // Si tiene hora fija (viene de Programacion ya creada), respetar
    if (trabajo.hora_inicio_fija) {
      tiempoActual = toMinutos(trabajo.hora_inicio_fija);
    } else {
      // Agregar traslado desde parada anterior (o desde el inicio si es el primero)
      if (i > 0) {
        const traslado = districtTimes.getTiempo(
          secuencia[i-1].distrito,
          trabajo.distrito
        );
        tiempoActual += traslado;
      }
    }
    
    const horaInicioMin = tiempoActual;
    const horaFinMin    = tiempoActual + trabajo.duracion_min;
    
    // Verificar overflow
    const overflow = horaFinMin > toMinutos(HORA_FIN_LIMITE);
    
    resultados.push({
      ...trabajo,
      hora_inicio:            toTimeStr(horaInicioMin),
      hora_fin:               toTimeStr(horaFinMin),
      traslado_desde_anterior: i === 0 ? 0 : districtTimes.getTiempo(
        secuencia[i-1].distrito, trabajo.distrito
      ),
      overflow,
    });
    
    if (!overflow) {
      tiempoActual = horaFinMin;
    }
  }
  
  return resultados;
}

function toMinutos(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function toTimeStr(minutos) {
  const h = Math.floor(minutos / 60).toString().padStart(2, '0');
  const m = (minutos % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
}
```

---

## Paso 6 — Detectar overflow

```javascript
function procesarOverflow(tecnicosConParadas) {
  const overflow = [];
  
  for (const tecnico of tecnicosConParadas) {
    const overflowItems = tecnico.trabajos.filter(t => t.overflow);
    const normales      = tecnico.trabajos.filter(t => !t.overflow);
    
    tecnico.trabajos = normales;
    overflow.push(...overflowItems.map(t => ({
      ...t,
      trabajador_id_propuesto: tecnico.trabajador_id,
      razon_overflow: 'No cabe en la jornada 08:30–18:30 con los trabajos previos.'
    })));
  }
  
  return { tecnicosConParadas, overflow };
}
```

---

## Paso 7 — Output: `propuesta_motor`

La estructura completa que sale del motor y va al LLM:

```typescript
interface PropuestaMotor {
  fecha:           string;        // 'YYYY-MM-DD'
  generado_en:     string;        // ISO datetime
  origen:          'motor';
  version:         '1.0';
  
  tecnicos: TecnicoPropuesta[];
  overflow: WorkItemConOverflow[];
  sin_elegible: WorkItem[];       // trabajos sin ningún técnico elegible disponible
}

interface TecnicoPropuesta {
  trabajador_id:   number;
  nombre:          string;
  apellido:        string;
  especialidad:    string;
  carga_minutos:   number;        // total de minutos de trabajo asignados
  carga_horas:     number;        // carga_minutos / 60 (para mostrar)
  trabajos:        TrabajoEnRuta[];
}

interface TrabajoEnRuta {
  // Identificación
  programacion_id:       number | null;
  mantenimiento_fijo_id: number | null;
  fuente:                'mantenimiento_fijo' | 'programacion_pendiente';
  
  // Ubicación
  cliente_id:            number;
  nombre_cliente:        string;
  distrito:              string;
  ascensor_id:           number;
  tipo_equipo:           string;
  
  // Trabajo
  tipo_trabajo:          string;
  duracion_min:          number;
  
  // Horario calculado
  hora_inicio:           string;   // 'HH:MM'
  hora_fin:              string;   // 'HH:MM'
  traslado_desde_anterior: number; // minutos (0 para el primero)
  
  // Estado
  overflow:              boolean;
  tecnico_preferido_respetado: boolean;
  
  // Para el LLM
  justificacion:         null;     // el motor no justifica; el LLM lo hace
}
```

---

## Prueba de unidad del motor (sin LLM)

El motor tiene que ser testeable standalone:

```javascript
// test: motor.service.test.js
describe('MotorService', () => {
  it('respeta la especialidad (no asigna reparación a Técnico de Mantenimiento)', () => { ... });
  it('ordena emergencias primero', () => { ... });
  it('respeta la ventana 08:30–18:30', () => { ... });
  it('detecta overflow correctamente', () => { ... });
  it('clusterea por distrito cuando hay múltiples técnicos', () => { ... });
  it('respeta la preferencia de técnico del MantenimientoFijo', () => { ... });
  it('maneja el caso donde ningún técnico es elegible para un trabajo', () => { ... });
  it('calcula correctamente los tiempos de traslado acumulados', () => { ... });
});
```

---

## Constantes configurables (desde `ConfiguracionIA`)

| Parámetro | Default | Descripción |
|---|---|---|
| `hora_inicio_default` | `08:30` | Inicio de jornada para todos los técnicos |
| `hora_fin_limite` | `18:30` | Fin máximo de jornada |
| `MAX_MINUTOS_DIA` | `600` | 10h absolutas (sin overflow) |
| `TIEMPO_MISMO_DISTRITO` | `15` | Minutos para traslado interno en mismo distrito |
| `TIEMPO_FALLBACK_DESCONOCIDO` | `90` | Tiempo si el distrito no está en la tabla |
| `MARGEN_ENTRE_TRABAJOS` | `0` | Minutos extra entre fin de un trabajo e inicio del siguiente (además del traslado) |

> `MARGEN_ENTRE_TRABAJOS` es 0 en v1. Si en la práctica los técnicos necesitan margen para documentar entre trabajos, subir a 10-15 min.
