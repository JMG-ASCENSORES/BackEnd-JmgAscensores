# Entrada del Motor — Definición del Trabajo y Carga de Técnicos

## Concepto: el admin define el trabajo

A diferencia de un optimizador batch, el Programador IA no lee un pool de trabajos pendientes. En cambio, el admin define el trabajo que quiere programar en tiempo real a través del formulario:

```
{
  cliente_id:     number    // cliente seleccionado en el formulario
  ascensor_id:    number    // equipo del cliente seleccionado
  tipo_trabajo:   'mantenimiento' | 'reparacion' | 'inspeccion' | 'emergencia'
  fecha:          'YYYY-MM-DD'
  hora_preferida: 'HH:MM' | null   // opcional: si el cliente tiene una ventana preferida
}
```

El motor recibe esta definición y evalúa qué técnico puede hacerlo mejor en ese horario.

---

## Enriquecimiento del trabajo desde la base de datos

Antes de pasar al motor, el backend enriquece la definición con datos que el admin no tiene que ingresar:

### 1. Datos del cliente y ascensor

```javascript
async function enriquecerTrabajo(trabajoInput) {
  const ascensor = await Ascensor.findByPk(trabajoInput.ascensor_id, {
    include: [{ model: Cliente, attributes: ['cliente_id', 'nombre_comercial', 'distrito', 'latitud', 'longitud'] }]
  });

  return {
    ...trabajoInput,
    nombre_cliente: ascensor.Cliente.nombre_comercial,
    distrito:       ascensor.Cliente.distrito,
    latitud:        ascensor.Cliente.latitud,
    longitud:       ascensor.Cliente.longitud,
    tipo_equipo:    ascensor.tipo_equipo,
    marca:          ascensor.marca,
  };
}
```

### 2. Configuración del tipo de trabajo

```javascript
async function enriquecerConConfiguracion(trabajo) {
  const config = await ConfiguracionIA.findOne({
    where: { tipo_trabajo: trabajo.tipo_trabajo, activo: true }
  });

  return {
    ...trabajo,
    duracion_min:        config?.duracion_min        ?? 60,
    tecnicos_requeridos: config?.tecnicos_requeridos ?? 1,
    prioridad:           config?.prioridad           ?? 4,
  };
}
```

---

## WorkItem — estructura del trabajo enriquecido

Este es el objeto que el motor recibe como entrada:

```typescript
interface WorkItem {
  // Definición del admin (input del formulario)
  cliente_id:      number;
  ascensor_id:     number;
  tipo_trabajo:    'mantenimiento' | 'reparacion' | 'inspeccion' | 'emergencia';
  fecha:           string;           // 'YYYY-MM-DD'
  hora_preferida:  string | null;    // 'HH:MM' — si el cliente tiene ventana preferida

  // Enriquecido desde la BD
  nombre_cliente:  string;
  distrito:        string;
  latitud:         number | null;
  longitud:        number | null;
  tipo_equipo:     string;
  marca:           string;

  // Enriquecido desde ConfiguracionIA
  duracion_min:        number;
  tecnicos_requeridos: number;
  prioridad:           number;       // 1-4
}
```

---

## Carga preexistente de los técnicos

La otra entrada del motor es la **carga actual de cada técnico** para la fecha objetivo. Esto es lo que el motor usa para encontrar huecos disponibles:

```sql
SELECT
  t.trabajador_id,
  t.nombre,
  t.apellido,
  t.especialidad,
  COUNT(p.programacion_id)                          AS trabajos_confirmados,
  SUM(TIMESTAMPDIFF(MINUTE, p.fecha_inicio, p.fecha_fin)) AS minutos_comprometidos,
  MAX(CAST(p.fecha_fin AS TIME))                    AS ultima_hora_fin,
  -- Trabajos confirmados como array para detectar solapamientos
  JSON_ARRAYAGG(JSON_OBJECT(
    'programacion_id', p.programacion_id,
    'hora_inicio',     CAST(p.fecha_inicio AS TIME),
    'hora_fin',        CAST(p.fecha_fin AS TIME),
    'distrito',        c.distrito
  )) AS trabajos_del_dia
FROM Trabajadores t
  LEFT JOIN Programaciones p ON (
    p.trabajador_id  = t.trabajador_id OR
    p.tecnico2_id    = t.trabajador_id OR
    p.tecnico3_id    = t.trabajador_id OR
    p.tecnico4_id    = t.trabajador_id
  )
  AND DATE(p.fecha_inicio) = DATE(:fecha_objetivo)
  AND p.estado NOT IN ('cancelado')
  AND p.trabajador_id IS NOT NULL
  LEFT JOIN Ascensores a ON a.ascensor_id = p.ascensor_id
  LEFT JOIN Clientes c ON c.cliente_id = a.cliente_id
WHERE t.estado_activo = true
GROUP BY t.trabajador_id, t.nombre, t.apellido, t.especialidad;
```

Esta query retorna todos los técnicos activos, con o sin trabajos ese día. El motor usa los `trabajos_del_dia` para calcular huecos disponibles sin solapamiento.

---

## Contexto adicional: MantenimientosFijos vencidos (solo lectura)

Los `MantenimientosFijos` vencidos para la fecha objetivo se muestran al admin como **contexto informativo**, no como input al motor. El admin puede ver "estos mantenimientos vencen mañana" y decidir programarlos usando el formulario.

```sql
SELECT
  mf.mantenimiento_fijo_id,
  mf.ascensor_id,
  mf.dia_mes,
  mf.hora                  AS hora_preferida,
  mf.frecuencia,
  a.tipo_equipo,
  c.nombre_comercial,
  c.distrito
FROM MantenimientosFijos mf
  JOIN Ascensores a ON a.ascensor_id = mf.ascensor_id
  JOIN Clientes   c ON c.cliente_id  = a.cliente_id
WHERE
  mf.activo   = true
  AND DAYOFMONTH(:fecha_objetivo) = mf.dia_mes
  AND c.estado_activo = true
  AND NOT EXISTS (
    SELECT 1 FROM Programaciones p
    WHERE p.ascensor_id           = mf.ascensor_id
      AND p.mantenimiento_fijo_id = mf.mantenimiento_fijo_id
      AND p.estado               NOT IN ('cancelado')
      AND p.fecha_inicio           >= :periodo_inicio
      AND p.fecha_inicio           <  :fecha_objetivo
  )
ORDER BY mf.hora ASC, c.distrito ASC;
```

El endpoint `GET /api/ia-scheduler/demand` sirve esta lista como contexto, no como pool de demanda.

### Lógica de frecuencia (para determinar si "vence mañana")

```javascript
function getPeriodoInicio(frecuencia, fechaObjetivo) {
  const fecha = new Date(fechaObjetivo);
  switch (frecuencia) {
    case 'mensual':     fecha.setDate(fecha.getDate() - 25);  break;
    case 'bimestral':   fecha.setDate(fecha.getDate() - 55);  break;
    case 'trimestral':  fecha.setDate(fecha.getDate() - 85);  break;
  }
  return fecha;
}
```

---

## Resumen del flujo del servicio

```
POST /api/ia-scheduler/generar
  body: { fecha, trabajo: { cliente_id, ascensor_id, tipo_trabajo, hora_preferida }, tecnico_ids }
         │
         ├── enriquecerTrabajo(trabajo)
         │     ├── JOIN Ascensores + Clientes → nombre_cliente, distrito, tipo_equipo
         │     └── JOIN ConfiguracionIA → duracion_min, prioridad, tecnicos_requeridos
         │
         ├── WorkerService.obtenerTecnicos(tecnico_ids, fecha)
         │     ├── datos del técnico (nombre, apellido, especialidad)
         │     ├── trabajos_del_dia (lista con hora_inicio, hora_fin, distrito)
         │     └── minutos_comprometidos, ultima_hora_fin
         │
         ├── MotorService.evaluarTecnicos(workItem, tecnicos)  → evaluacion_motor
         │     ├── Filtrar por elegibilidad (ELEGIBILIDAD matrix)
         │     ├── Para cada elegible: calcular mejor slot disponible
         │     ├── Ordenar por idoneidad (menor carga + mejor cluster)
         │     └── Retornar { sugerencia, alternativas, sin_elegible }
         │
         └── LLMService.validarYJustificar(workItem, evaluacion_motor)  → sugerencia_final
               ├── Validar restricciones duras
               ├── Agregar justificación por técnico
               └── Retornar sugerencia con justificaciones
```

---

## Estructura del output del motor (`EvaluacionMotor`)

```typescript
interface EvaluacionMotor {
  fecha:        string;          // 'YYYY-MM-DD'
  generado_en:  string;          // ISO datetime
  origen:       'motor';
  version:      '1.0';

  trabajo: WorkItem;             // el trabajo enriquecido que se va a programar

  sugerencia: SlotSugerido | null;     // mejor opción (null si no hay técnico elegible)
  alternativas: SlotSugerido[];        // otras opciones viables, ordenadas
  sin_elegible: boolean;               // true si ningún técnico puede hacer este trabajo
  razon_sin_elegible: string | null;   // explicación si sin_elegible = true
}

interface SlotSugerido {
  trabajador_id:   number;
  nombre:          string;
  apellido:        string;
  especialidad:    string;
  hora_inicio:     string;       // 'HH:MM' — calculado por el motor
  hora_fin:        string;       // 'HH:MM' — hora_inicio + duracion_min
  traslado_min:    number;       // minutos de traslado desde su última parada
  carga_previa_horas: number;    // horas ya comprometidas antes de este trabajo
  justificacion:   string | null; // null en motor, completado por LLM
}
```
