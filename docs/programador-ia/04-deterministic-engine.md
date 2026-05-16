# Motor Determinista — Algoritmo Completo

El motor es la Capa 1 del sistema. No usa IA. Es puro código JavaScript/Node que evalúa todos los técnicos elegibles para un trabajo específico y calcula el mejor slot disponible para cada uno. Vive en `/BackEnd-JmgAscensores/src/services/ia-scheduler/motor.service.js`.

**Características clave**:
- Sin llamadas externas — corre en memoria con datos ya cargados.
- Determinista — el mismo input siempre produce el mismo output.
- Testeable en aislamiento con datos mock.
- Si falla, lanza excepción; nunca produce evaluación parcialmente inválida.

---

## Diferencia con el diseño batch anterior

El motor ya no recibe un array de múltiples trabajos para asignar a múltiples técnicos. Ahora recibe **un único trabajo** y evalúa qué técnico es el más idóneo, calculando para cada uno el slot disponible que mejor encaja.

```javascript
// ANTES (batch): generarPropuesta(workItems[], tecnicos[]) → PropuestaMotor
// AHORA (single): evaluarTecnicos(workItem, tecnicos[])    → EvaluacionMotor
```

---

## Estructura del servicio

```javascript
// motor.service.js
class MotorService {
  constructor(districtTimesService, configService) {
    this.districtTimes = districtTimesService;
    this.config        = configService;
  }

  async evaluarTecnicos(workItem, tecnicos) {
    // 1. Validar inputs
    // 2. Filtrar técnicos elegibles por especialidad
    // 3. Para cada elegible: calcular el mejor slot disponible
    // 4. Ordenar por idoneidad
    // 5. Retornar EvaluacionMotor
  }
}
```

---

## Paso 1 — Validar inputs

```javascript
function validarInputs(workItem, tecnicos) {
  if (!workItem?.cliente_id || !workItem?.ascensor_id) {
    throw new Error('El trabajo debe tener cliente_id y ascensor_id.');
  }
  if (!workItem.tipo_trabajo) {
    throw new Error('El trabajo debe tener tipo_trabajo.');
  }
  if (!workItem.distrito) {
    console.warn('[Motor] Trabajo sin distrito — se usará fallback de 90 min para traslados.');
  }
  if (!tecnicos || tecnicos.length === 0) {
    throw new Error('No hay técnicos disponibles para evaluar.');
  }
}
```

---

## Paso 2 — Filtrar técnicos elegibles

```javascript
const ELEGIBILIDAD = {
  mantenimiento: ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico'],
  reparacion:    ['Técnico de Reparaciones', 'Supervisor Técnico'],
  inspeccion:    ['Supervisor Técnico', 'Técnico General'],
  emergencia:    ['Técnico General', 'Técnico de Mantenimiento', 'Supervisor Técnico', 'Técnico de Reparaciones'],
};

function filtrarElegibles(workItem, tecnicos) {
  const especialidadesPermitidas = ELEGIBILIDAD[workItem.tipo_trabajo] || [];
  return tecnicos.filter(t => especialidadesPermitidas.includes(t.especialidad));
}
```

Si ningún técnico es elegible, el motor retorna `{ sugerencia: null, alternativas: [], sin_elegible: true }`.

---

## Paso 3 — Calcular el mejor slot para cada técnico

Para cada técnico elegible, el motor calcula cuándo puede hacer el trabajo sin solapamiento con sus trabajos existentes.

```javascript
function calcularSlot(workItem, tecnico) {
  const HORA_INICIO_JORNADA = '08:30';
  const HORA_FIN_LIMITE     = '18:30';
  const duracion            = workItem.duracion_min;

  // Obtener todos los bloques ocupados del técnico para ese día
  const bloques = (tecnico.trabajos_del_dia || [])
    .map(t => ({
      inicio: toMinutos(t.hora_inicio),
      fin:    toMinutos(t.hora_fin),
      distrito: t.distrito,
    }))
    .sort((a, b) => a.inicio - b.inicio);

  // Si tiene hora preferida del cliente, intentar ese slot primero
  if (workItem.hora_preferida) {
    const slot = intentarSlotEnHoraPreferida(workItem, tecnico, bloques, duracion);
    if (slot) return slot;
  }

  // Buscar el primer hueco disponible en la jornada
  return buscarPrimerHueco(workItem, tecnico, bloques, duracion, HORA_INICIO_JORNADA, HORA_FIN_LIMITE);
}

function intentarSlotEnHoraPreferida(workItem, tecnico, bloques, duracion) {
  const horaPreferidaMin = toMinutos(workItem.hora_preferida);

  // Calcular traslado desde la última parada previa a hora_preferida
  const bloqueAnterior = bloques
    .filter(b => b.fin <= horaPreferidaMin)
    .sort((a, b) => b.fin - a.fin)[0];

  const trasladoMin = bloqueAnterior
    ? districtTimes.getTiempo(bloqueAnterior.distrito, workItem.distrito)
    : 0;

  const inicioReal = Math.max(
    toMinutos('08:30'),
    horaPreferidaMin
  );

  // Verificar que puede llegar a tiempo (traslado desde bloque anterior)
  if (bloqueAnterior && bloqueAnterior.fin + trasladoMin > inicioReal) {
    return null; // no puede llegar a la hora preferida
  }

  const finReal = inicioReal + duracion;

  // Verificar que no se solapa con ningún bloque posterior
  const solapamiento = bloques.some(b =>
    b.inicio < finReal && b.fin > inicioReal
  );

  if (solapamiento || finReal > toMinutos('18:30')) return null;

  return {
    hora_inicio:  toTimeStr(inicioReal),
    hora_fin:     toTimeStr(finReal),
    traslado_min: bloqueAnterior ? trasladoMin : 0,
  };
}

function buscarPrimerHueco(workItem, tecnico, bloques, duracion, horaInicio, horaFin) {
  const finJornada = toMinutos(horaFin);
  let cursor = toMinutos(horaInicio);

  // Si el técnico ya tiene trabajos, empezar después del último
  for (const bloque of bloques) {
    if (cursor < bloque.inicio) {
      // Hay un hueco antes de este bloque
      const traslado = cursor > toMinutos(horaInicio)
        ? districtTimes.getTiempo(bloques[bloques.indexOf(bloque) - 1]?.distrito, workItem.distrito)
        : 0;
      const inicioConTraslado = cursor + traslado;
      const fin = inicioConTraslado + duracion;

      if (fin <= bloque.inicio && fin <= finJornada) {
        return {
          hora_inicio: toTimeStr(inicioConTraslado),
          hora_fin:    toTimeStr(fin),
          traslado_min: traslado,
        };
      }
    }
    cursor = bloque.fin;
  }

  // Hueco después del último trabajo
  const ultimoBloque = bloques[bloques.length - 1];
  const traslado = ultimoBloque
    ? districtTimes.getTiempo(ultimoBloque.distrito, workItem.distrito)
    : 0;
  const inicio = cursor + traslado;
  const fin    = inicio + duracion;

  if (fin <= finJornada) {
    return {
      hora_inicio: toTimeStr(inicio),
      hora_fin:    toTimeStr(fin),
      traslado_min: traslado,
    };
  }

  return null; // no cabe en la jornada
}
```

---

## Paso 4 — Ordenar técnicos por idoneidad

Los técnicos con slot disponible se ordenan por:

1. **Respeta hora preferida**: si el cliente pidió una hora y el técnico puede llegar a tiempo → prioridad 1.
2. **Menor carga previa**: el técnico con menos horas comprometidas ese día.
3. **Mejor cluster geográfico**: si el técnico ya tiene trabajos en el mismo distrito o adyacente → penalización menor de traslado.

```javascript
function ordenarPorIdoneidad(candidatos, workItem) {
  return candidatos
    .filter(c => c.slot !== null)
    .sort((a, b) => {
      // Prioridad: respeta hora preferida
      if (workItem.hora_preferida) {
        const aRespeta = a.slot.hora_inicio === workItem.hora_preferida ? 0 : 1;
        const bRespeta = b.slot.hora_inicio === workItem.hora_preferida ? 0 : 1;
        if (aRespeta !== bRespeta) return aRespeta - bRespeta;
      }

      // Menor traslado desde su última parada
      if (a.slot.traslado_min !== b.slot.traslado_min) {
        return a.slot.traslado_min - b.slot.traslado_min;
      }

      // Menor carga previa
      return a.minutos_comprometidos - b.minutos_comprometidos;
    });
}
```

---

## Paso 5 — Output: `EvaluacionMotor`

```typescript
interface EvaluacionMotor {
  fecha:        string;          // 'YYYY-MM-DD'
  generado_en:  string;          // ISO datetime
  origen:       'motor';
  version:      '1.0';

  trabajo: WorkItemEnriquecido;  // el trabajo con todos los datos del cliente/equipo

  sugerencia: SlotSugerido | null;    // el técnico más idóneo (null si sin_elegible)
  alternativas: SlotSugerido[];       // demás técnicos con slot disponible, ordenados
  sin_elegible: boolean;
  razon_sin_elegible: string | null;
}

interface SlotSugerido {
  trabajador_id:      number;
  nombre:             string;
  apellido:           string;
  especialidad:       string;
  hora_inicio:        string;          // 'HH:MM'
  hora_fin:           string;          // 'HH:MM'
  traslado_min:       number;          // 0 si es el primer trabajo del día
  carga_previa_horas: number;          // horas ya comprometidas ANTES de este slot
  justificacion:      null;            // el motor no justifica; el LLM lo hace
}
```

---

## Pruebas de unidad del motor

```javascript
// test: motor.service.test.js
describe('MotorService.evaluarTecnicos', () => {
  it('filtra correctamente por especialidad (reparación no va a Técnico de Mantenimiento)', () => { ... });
  it('calcula slot correcto respetando hora preferida del cliente', () => { ... });
  it('calcula slot correcto cuando el técnico tiene trabajos previos ese día', () => { ... });
  it('respeta traslado entre distritos al calcular slot', () => { ... });
  it('detecta solapamiento y no propone slot inválido', () => { ... });
  it('detecta que el trabajo no cabe en la jornada 08:30–18:30', () => { ... });
  it('retorna sin_elegible: true cuando ningún técnico puede hacer el tipo de trabajo', () => { ... });
  it('ordena alternativas: primero quien respeta hora preferida', () => { ... });
  it('ordena alternativas: primero menor traslado cuando no hay hora preferida', () => { ... });
  it('técnico sin trabajos previos: slot comienza en 08:30', () => { ... });
});
```

---

## Constantes configurables (desde `ConfiguracionIA`)

| Parámetro | Default | Descripción |
|---|---|---|
| `hora_inicio_default` | `08:30` | Inicio de jornada para todos los técnicos |
| `hora_fin_limite` | `18:30` | Fin máximo de jornada |
| `TIEMPO_MISMO_DISTRITO` | `15` | Minutos para traslado interno en mismo distrito |
| `TIEMPO_FALLBACK_DESCONOCIDO` | `90` | Tiempo si el distrito no está en la tabla |

---

## Helpers

```javascript
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
