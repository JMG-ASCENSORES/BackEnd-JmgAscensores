# Fuentes de Demanda — Programador IA

## Concepto: el "pool de trabajos"

Antes de correr el motor, el backend construye el **pool de trabajos pendientes para mañana**. Este pool es la entrada principal del algoritmo. El motor no inventa trabajos — solo organiza los que ya existen o los que deben generarse a partir de planes fijos.

Fecha objetivo: siempre `CURDATE() + INTERVAL 1 DAY` (mañana). El admin puede cambiarla en la UI.

---

## Fuente A — MantenimientosFijos vencidos mañana

### Lógica

Un `MantenimientoFijo` "vence mañana" cuando:
1. `activo = true`
2. `dia_mes = DAY(fecha_objetivo)` — el día del mes coincide
3. No existe ya una `Programacion` para ese `ascensor_id` + `mantenimiento_fijo_id` dentro del período de la frecuencia

### Lógica de frecuencia (cálculo del período)

```javascript
function getPeriodoInicio(frecuencia, fechaObjetivo) {
  const fecha = new Date(fechaObjetivo);
  switch (frecuencia) {
    case 'mensual':     fecha.setDate(fecha.getDate() - 25);  break; // ~1 mes con margen
    case 'bimestral':   fecha.setDate(fecha.getDate() - 55);  break; // ~2 meses con margen
    case 'trimestral':  fecha.setDate(fecha.getDate() - 85);  break; // ~3 meses con margen
  }
  return fecha;
}
```

El margen (días de diferencia vs el período exacto) existe para meses cortos como febrero: un plan mensual del día 30 en enero debe vencer en febrero aunque febrero no tenga día 30 — se programa el último día del mes. El margen corto evita duplicados.

### Query SQL (Sequelize raw o ORM)

```sql
SELECT
  mf.mantenimiento_fijo_id,
  mf.ascensor_id,
  mf.trabajador_id                AS tecnico_preferido_id,
  mf.hora                         AS hora_preferida,
  mf.frecuencia,
  a.tipo_equipo,
  a.marca,
  a.modelo,
  c.cliente_id,
  c.nombre_comercial,
  c.distrito,
  c.latitud,
  c.longitud,
  c.ubicacion,
  -- tipo_trabajo siempre es 'mantenimiento' para MantenimientoFijo
  'mantenimiento'                 AS tipo_trabajo,
  NULL                            AS programacion_id   -- aún no creada
FROM MantenimientosFijos mf
  JOIN Ascensores a ON a.ascensor_id = mf.ascensor_id
  JOIN Clientes   c ON c.cliente_id  = a.cliente_id
WHERE
  mf.activo   = true
  AND DAYOFMONTH(:fecha_objetivo) = mf.dia_mes
  AND c.estado_activo = true
  AND NOT EXISTS (
    SELECT 1
    FROM Programaciones p
    WHERE p.ascensor_id            = mf.ascensor_id
      AND p.mantenimiento_fijo_id  = mf.mantenimiento_fijo_id
      AND p.estado               NOT IN ('cancelado')
      AND p.fecha_inicio           >= :periodo_inicio
      AND p.fecha_inicio           <  :fecha_objetivo
  )
ORDER BY mf.hora ASC, c.distrito ASC;
```

**Parámetros**:
- `:fecha_objetivo` = mañana (DATETIME 00:00:00)
- `:periodo_inicio` = resultado de `getPeriodoInicio(frecuencia, fecha_objetivo)` — se calcula por cada fila o se aplica un mínimo (25 días para cubrir mensual de todos)

**Nota sobre frecuencias mixtas**: la query anterior puede simplificarse usando 25 días como filtro universal (el período más corto = mensual). Los bimestrales y trimestrales que genuinamente no vencen hoy serán filtrados porque su `dia_mes` no coincide con el día de mañana. La verificación de "no existe en el período" con 25 días es suficiente para el mensual; los demás nunca tendrán colisión porque su `dia_mes` coincide solo cada 2 o 3 meses.

---

## Fuente B — Programaciones pendientes sin técnico asignado para mañana

Estos son trabajos que el admin ya creó manualmente para mañana pero que no tienen técnico asignado todavía.

```sql
SELECT
  p.programacion_id,
  p.titulo,
  p.fecha_inicio,
  p.fecha_fin,
  p.tipo_trabajo,
  p.ascensor_id,
  p.mantenimiento_fijo_id,
  a.tipo_equipo,
  a.marca,
  c.cliente_id,
  c.nombre_comercial,
  c.distrito,
  c.latitud,
  c.longitud,
  c.ubicacion,
  NULL AS tecnico_preferido_id,
  NULL AS hora_preferida
FROM Programaciones p
  JOIN Clientes  c ON c.cliente_id  = p.cliente_id
  LEFT JOIN Ascensores a ON a.ascensor_id = p.ascensor_id
WHERE
  DATE(p.fecha_inicio) = DATE(:fecha_objetivo)
  AND p.estado         = 'pendiente'
  AND p.trabajador_id  IS NULL
ORDER BY p.tipo_trabajo ASC, p.fecha_inicio ASC;
```

**Nota**: estas `Programaciones` ya tienen `fecha_inicio`/`fecha_fin` definidas. El motor las respeta como **restricción de tiempo** (no las reordena libremente). Si tienen conflicto con otra parada, el motor lo detecta y lo marca como overflow.

---

## Combinación del pool

El servicio `DemandService` combina Fuente A + Fuente B en un array unificado `WorkItem[]`:

```typescript
interface WorkItem {
  // Identificación
  programacion_id:        number | null;    // null = vendrá de MantenimientoFijo
  mantenimiento_fijo_id:  number | null;
  
  // Cliente y ubicación
  cliente_id:             number;
  nombre_cliente:         string;
  distrito:               string;
  latitud:                number | null;
  longitud:               number | null;
  
  // Ascensor
  ascensor_id:            number;
  tipo_equipo:            string;
  
  // Trabajo
  tipo_trabajo:           'mantenimiento' | 'reparacion' | 'inspeccion' | 'emergencia';
  duracion_min:           number;           // leído de ConfiguracionIA
  tecnicos_requeridos:    number;           // leído de ConfiguracionIA
  prioridad:              number;           // 1-4, leído de ConfiguracionIA
  
  // Restricciones de tiempo (opcionales)
  hora_preferida:         string | null;    // 'HH:MM' — de MantenimientoFijo.hora
  hora_inicio_fija:       string | null;    // 'HH:MM' — de Programacion.fecha_inicio si ya tiene hora
  hora_fin_fija:          string | null;    // 'HH:MM' — de Programacion.fecha_fin si ya tiene hora
  
  // Asignación preferida
  tecnico_preferido_id:   number | null;    // de MantenimientoFijo.trabajador_id
  
  // Estado interno
  fuente:                 'mantenimiento_fijo' | 'programacion_pendiente';
  overflow:               boolean;          // se setea en true si no cabe en la jornada
}
```

### Enriquecimiento del WorkItem desde ConfiguracionIA

Después de obtener los trabajos, el servicio enriquece cada item con los valores de `ConfiguracionIA`:

```javascript
async function enriquecerConConfiguracion(items) {
  const config = await ConfiguracionIA.findAll({ where: { activo: true } });
  const configMap = Object.fromEntries(config.map(c => [c.tipo_trabajo, c]));
  
  return items.map(item => ({
    ...item,
    duracion_min:        configMap[item.tipo_trabajo]?.duracion_min        ?? 60,
    tecnicos_requeridos: configMap[item.tipo_trabajo]?.tecnicos_requeridos ?? 1,
    prioridad:           configMap[item.tipo_trabajo]?.prioridad           ?? 4,
  }));
}
```

---

## Deduplicación

Es posible que un MantenimientoFijo del día coincida con una Programación pendiente ya creada para ese ascensor (el admin la creó manualmente). Para evitar duplicados:

```javascript
function deduplicar(fuenteA, fuenteB) {
  const ascensoresEnB = new Set(fuenteB.map(w => w.ascensor_id));
  // Si un MantenimientoFijo ya tiene una Programación pendiente para mañana,
  // excluirlo de la Fuente A (ya está en B)
  const fuenteAFiltrada = fuenteA.filter(w => !ascensoresEnB.has(w.ascensor_id));
  return [...fuenteAFiltrada, ...fuenteB];
}
```

---

## Carga preexistente de los técnicos

Adicionalmente a los trabajos del pool, el servicio calcula la **carga actual del técnico** para mañana (trabajos que ya tiene confirmados, no parte del pool):

```sql
SELECT
  t.trabajador_id,
  COUNT(p.programacion_id)                          AS trabajos_confirmados,
  SUM(TIMESTAMPDIFF(MINUTE, p.fecha_inicio, p.fecha_fin)) AS minutos_comprometidos
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
WHERE t.estado_activo = true
  AND t.trabajador_id IN (:ids_tecnicos_seleccionados)
GROUP BY t.trabajador_id;
```

Esta carga se pasa al motor para que balance los nuevos trabajos sobre lo que ya tiene cada técnico.

---

## Resumen del flujo del servicio

```
GET /api/ia-scheduler/generar?fecha=2026-05-12&tecnicoIds=1,3,5
         │
         ├── DemandService.obtenerPool(fecha)
         │     ├── queryFuenteA(fecha)           // MantenimientosFijos vencidos
         │     ├── queryFuenteB(fecha)           // Programaciones sin técnico
         │     ├── deduplicar(A, B)
         │     └── enriquecerConConfiguracion()
         │
         ├── WorkerService.obtenerTecnicos(ids, fecha)
         │     ├── datos del técnico (nombre, especialidad)
         │     └── cargaPreexistente(fecha)
         │
         ├── MotorService.generarPropuesta(pool, tecnicos)  → propuesta_motor
         │
         └── LLMService.ajustarPropuesta(propuesta_motor)   → propuesta_final
```
