# Review — Fase 0 y Fase 1: Bugs y Observaciones

**Fecha de revisión**: 2026-05-11  
**Fases auditadas**: Fase 0 (Migraciones de BD) y Fase 1 (Motor determinista)  
**Estado general**: Implementación mayoritariamente correcta. 2 bugs reales y 3 observaciones menores.

---

## Índice

1. [Bug 1 — Motor siempre usa ventana horaria hardcodeada](#bug-1)
2. [Bug 2 — `tecnico_preferido_respetado` siempre es `false`](#bug-2)
3. [Observación 1 — `getTecnicos` no usa la instancia lazy de WorkerService](#obs-1)
4. [Observación 2 — Comportamiento de `calcularHorarios` con overflow intermedio](#obs-2)
5. [Observación 3 — Tests de integración pasan con BD vacía](#obs-3)
6. [Inconsistencia de naming — TablaDistritoLima vs TablaDistritosLima](#naming)
7. [Qué está correcto](#correcto)

---

<a name="bug-1"></a>
## Bug 1 — MEDIO: El motor siempre usa la ventana horaria hardcodeada

### Archivos involucrados
- `src/controllers/ia-scheduler.controller.js` — línea 24
- `src/services/ia-scheduler/motor.service.js` — líneas 288-289
- `src/models/ConfiguracionIA.js` — campos `hora_inicio_default`, `hora_fin_limite`

### Descripción

El modelo `ConfiguracionIA` almacena en BD dos campos por fila: `hora_inicio_default` y `hora_fin_limite`. La intención del diseño es que el administrador pueda ajustar la ventana horaria de la jornada (`08:30–18:30`) sin necesidad de redeploy, a través del endpoint `PUT /api/ia-scheduler/configuracion`.

El endpoint existe y funciona: modifica el registro en BD. El endpoint `GET /configuracion` también devuelve la ventana al frontend. **El problema es que el motor nunca la lee.**

### Causa raíz

En el controller, los servicios se inicializan de forma lazy:

```js
// ia-scheduler.controller.js — línea 22-26
function _getServices(districtTimes) {
  if (!_demandService) _demandService = new DemandService();
  if (!_workerService) _workerService = new WorkerService();
  if (!_motorService)  _motorService  = new MotorService(districtTimes); // ← sin config
  return { demandService: _demandService, workerService: _workerService, motorService: _motorService };
}
```

El constructor de `MotorService` acepta un segundo argumento `config`:

```js
// motor.service.js — líneas 47-50
constructor(districtTimesService, config = {}) {
  this.districtTimes = districtTimesService;
  this.config = config;  // si no se pasa, queda como {}
}
```

Y `calcularHorarios` usa ese config con fallback a los valores hardcodeados:

```js
// motor.service.js — líneas 288-289
const HORA_INICIO_JORNADA = config.hora_inicio_default || '08:30'; // SIEMPRE '08:30'
const HORA_FIN_LIMITE     = config.hora_fin_limite     || '18:30'; // SIEMPRE '18:30'
```

Como `config` llega vacío `{}`, los operadores `||` siempre caen al default hardcodeado. El valor en BD nunca se consulta al momento de generar la propuesta.

### Impacto

- El admin puede modificar `hora_inicio_default` y `hora_fin_limite` en BD a través del endpoint, y el `GET /configuracion` devolverá los nuevos valores al frontend. Pero al generar una propuesta, el motor siempre calculará con `08:30–18:30`.
- La funcionalidad de "configurar la ventana horaria desde admin sin redeploy" que aparece en la propuesta como feature clave queda rota de forma silenciosa.
- Los tests del motor usan `'08:30'` y `'18:30'` hardcodeados, por lo que pasan sin detectar esto.

### Corrección sugerida

En el handler `generar` del controller, leer la config de BD antes de construir (o reconfigurar) el motor:

```js
// ia-scheduler.controller.js — dentro de `generar`
const configRows = await ConfiguracionIA.findAll({ where: { activo: true } });
const primerConfig = configRows[0];
const motorConfig = {
  hora_inicio_default: primerConfig ? String(primerConfig.hora_inicio_default).substring(0, 5) : '08:30',
  hora_fin_limite:     primerConfig ? String(primerConfig.hora_fin_limite).substring(0, 5)     : '18:30'
};

// Reconstruir el motor con la config actualizada (o invalidar la instancia lazy cuando la config cambia)
const motorService = new MotorService(districtTimes, motorConfig);
const propuestaMotor = motorService.generarPropuesta(pool, tecnicos, fecha);
```

Alternativa: invalidar `_motorService = null` en el handler `updateConfiguracion` para que se reconstruya en el próximo request de generación. Esto evita tener que leer la config en cada `generar`.

---

<a name="bug-2"></a>
## Bug 2 — MENOR: `tecnico_preferido_respetado` siempre es `false`

### Archivos involucrados
- `src/services/ia-scheduler/motor.service.js` — método `elegirTecnico` (líneas 137-158) y `_toTrabajoEnRuta` (líneas 441-463)

### Descripción

El campo `tecnico_preferido_respetado` en la respuesta de `PropuestaMotor` está diseñado para indicar si el técnico preferido de un `MantenimientoFijo` fue efectivamente asignado. Este campo es importante para:

1. El frontend: en la vista de timeline, permite mostrar un indicador visual de "técnico preferido respetado".
2. El LLM (Fase 2): el system prompt puede usar este campo para justificar las asignaciones.
3. Auditoría: permite saber si el motor respetó las preferencias históricas del admin.

### Causa raíz

El método `elegirTecnico` sí implementa la lógica correctamente:

```js
// motor.service.js — líneas 139-143
if (workItem.tecnico_preferido_id) {
  const preferido = candidatos.find(t => t.trabajador_id === workItem.tecnico_preferido_id);
  if (preferido && this.getCargaMinutos(preferido, asignaciones) < MAX_MINUTOS_DIA) {
    return preferido; // ← el preferido fue elegido
  }
}
```

Pero cuando retorna el técnico preferido, **no se actualiza ningún campo en el `workItem`**. Más adelante, `_toTrabajoEnRuta` usa el valor que ya tenía el objeto:

```js
// motor.service.js — línea 457
tecnico_preferido_respetado: w.tecnico_preferido_respetado || false,
// → siempre false porque el workItem nunca tuvo este campo seteado a true
```

El bug es de omisión: `elegirTecnico` sabe cuándo respetó la preferencia, pero no lo comunica hacia afuera.

### Impacto

- Todos los trabajos en la respuesta muestran `tecnico_preferido_respetado: false`, incluso cuando el técnico preferido fue el elegido.
- Es un dato silenciosamente incorrecto que llegará al frontend y al LLM en Fase 2.
- El test 1.31 ("asigna al técnico preferido si está disponible") verifica que el técnico correcto es asignado, pero no verifica el valor del flag. Por eso el test pasa y el bug no fue detectado.

### Corrección sugerida

En `asignarTecnicos`, después de elegir el técnico, marcar el workItem antes de agregarlo a la lista:

```js
// motor.service.js — dentro de asignarTecnicos, tras elegirTecnico()
const elegido = this.elegirTecnico(workItem, candidatos, asignaciones);
if (!elegido) {
  sinElegible.push({ ...workItem, razon_sin_tecnico: 'Todos los técnicos elegibles están saturados.' });
  continue;
}

// Marcar si se respetó la preferencia
const preferidoRespetado = workItem.tecnico_preferido_id
  ? elegido.trabajador_id === workItem.tecnico_preferido_id
  : false;

const lista = asignaciones.get(elegido.trabajador_id) || [];
lista.push({ ...workItem, tecnico_preferido_respetado: preferidoRespetado });
asignaciones.set(elegido.trabajador_id, lista);
```

---

<a name="obs-1"></a>
## Observación 1 — `getTecnicos` no usa la instancia lazy de WorkerService

### Archivos involucrados
- `src/controllers/ia-scheduler.controller.js` — líneas 102-104

### Descripción

El controller usa un patrón de inicialización lazy para todos los servicios: se crean una sola vez y se reutilizan en requests subsiguientes. La función `_getServices()` encapsula este patrón.

Sin embargo, el handler `getTecnicos` crea una nueva instancia de `WorkerService` en cada request:

```js
// ia-scheduler.controller.js — línea 102
const workerService = new WorkerService(); // nueva instancia en cada request
```

En cambio, `generar` sí usa el patrón correcto:

```js
// ia-scheduler.controller.js — línea 137
const { demandService, workerService, motorService } = _getServices(districtTimes);
```

### Impacto

`WorkerService` no tiene estado interno (no carga datos en memoria al inicializar, a diferencia de `DistrictTimesService`), por lo que crear una nueva instancia en cada request no tiene consecuencias funcionales ni de performance significativas.

El problema es de consistencia y mantenibilidad: si en el futuro `WorkerService` adquiere estado (como un caché de técnicos activos), `getTecnicos` quedaría desincronizado.

### Corrección sugerida

```js
// Reemplazar en getTecnicos
const districtTimes = await _getDistrictTimes();
const { workerService } = _getServices(districtTimes);
```

---

<a name="obs-2"></a>
## Observación 2 — Comportamiento de `calcularHorarios` con overflow intermedio

### Archivos involucrados
- `src/services/ia-scheduler/motor.service.js` — método `calcularHorarios` (líneas 287-340)

### Descripción

Cuando un trabajo en la secuencia de un técnico excede la ventana horaria (overflow), `tiempoActual` no avanza:

```js
// motor.service.js — líneas 333-337
if (!overflow) {
  tiempoActual = horaFinMin + MARGEN_ENTRE_TRABAJOS;
}
// Si overflow, tiempoActual NO cambia → el siguiente trabajo arranca desde el mismo punto
```

Esto genera un comportamiento ambiguo cuando el overflow ocurre en el medio de la secuencia:

**Ejemplo concreto**:
- Técnico con jornada 08:30–18:30 (máximo 1110 min desde medianoche).
- Trabajo A (posición 5): inicia 17:00, dura 120 min → fin 19:00 → **overflow**.
- `tiempoActual` se queda en 17:00.
- Trabajo B (posición 6): inicia 17:00, dura 30 min → fin 17:30 → **NO overflow**.

El resultado es que B aparece en la propuesta como válido, pero físicamente debería venir después de A (que ya está en overtime). El admin vería B como un trabajo "normal" del día cuando en realidad también debería ser overflow.

### Contexto

Esto raramente ocurre en la práctica porque:
1. `nearestNeighbor` agrupa trabajos por proximidad, no por duración. Una vez que la jornada está llena, trabajos posteriores en la secuencia suelen también causar overflow.
2. Con 8-12 trabajos diarios y duraciones típicas de 45-120 min, el overflow ocurre generalmente hacia el final de la secuencia, no en el medio.

Aun así, es un caso edge que puede producir propuestas con datos inconsistentes.

### Corrección sugerida

Una vez que un trabajo genera overflow, marcar todos los trabajos subsiguientes de la secuencia también como overflow, sin necesidad de continuar calculando:

```js
// motor.service.js — dentro de calcularHorarios
let overflowActivado = false;

for (let i = 0; i < secuencia.length; i++) {
  const trabajo = secuencia[i];
  // ... cálculo de traslado y tiempoActual ...

  const horaInicioMin = tiempoActual;
  const horaFinMin    = tiempoActual + trabajo.duracion_min;
  const overflow      = overflowActivado || horaFinMin > toMinutos(HORA_FIN_LIMITE);

  if (overflow) overflowActivado = true; // todos los siguientes también son overflow

  resultados.push({ ...trabajo, hora_inicio: toTimeStr(horaInicioMin), hora_fin: toTimeStr(horaFinMin), traslado_desde_anterior: traslado, overflow });

  if (!overflow) {
    tiempoActual = horaFinMin + MARGEN_ENTRE_TRABAJOS;
  }
}
```

---

<a name="obs-3"></a>
## Observación 3 — Tests de integración pasan con BD vacía

### Archivos involucrados
- `src/services/ia-scheduler/__tests__/demand.service.test.js`
- `src/services/ia-scheduler/__tests__/worker.service.test.js`

### Descripción

Los tests de integración de `DemandService` y `WorkerService` apuntan a la BD real. Varios de los asserts están escritos de forma defensiva para no fallar si la BD no tiene datos:

```js
// demand.service.test.js — línea 43
it('cada item tiene los campos requeridos de WorkItem', async () => {
  const result = await service.obtenerFuenteA('2026-05-12');
  if (result.length > 0) {   // ← el test pasa si result es []
    const item = result[0];
    expect(item).toHaveProperty('mantenimiento_fijo_id');
    // ...
  }
});
```

```js
// worker.service.test.js — líneas 33-38
if (activos.length === 0) {
  console.log('No hay técnicos activos en la BD — test omitido');
  return; // ← el test pasa sin verificar nada
}
```

El test de `enriquecerConConfiguracion` que verifica valores específicos:

```js
// demand.service.test.js — líneas 124-131
expect(result[0].duracion_min).toBe(60);    // mantenimiento = 60 min
expect(result[1].duracion_min).toBe(120);   // reparacion = 120 min
```

Este test sí falla si los seeds de `ConfiguracionIA` no fueron cargados. Es el único que da garantía real.

### Impacto

Si en CI se corre la suite sin haber ejecutado el seed (`scripts/seeds/seed-configuracion-ia.sql`), la mayoría de los tests de integración van a pasar (verde) aunque los servicios tengan bugs con datos reales.

El test de la tarea 1.14 especificada en `tasks.md` — "técnico con 2 Programaciones confirmadas reporta 120 min de carga" — no existe como caso de prueba determinista. El test verifica la estructura del objeto pero no el cálculo específico de 120 min.

### Sugerencia

Para los casos críticos de negocio, agregar tests unitarios con mocks de Sequelize (como se hizo en `district-times.service.test.js`) que sean deterministas e independientes de la BD. Los tests de integración existentes son un buen complemento, no el único guard.

---

<a name="naming"></a>
## Inconsistencia de naming — `TablaDistritoLima` vs `TablaDistritosLima`

### Archivos involucrados
- `src/models/TablaDistritoLima.js`
- `scripts/migrations/003-tabla-distritos-lima.sql`
- `src/services/ia-scheduler/district-times.service.js`

### Descripción

El modelo Sequelize se llama `TablaDistritoLima` (sin "s" en "Distritos"), pero la tabla en PostgreSQL se llama `TablaDistritosLima` (con "s"). El modelo declara explícitamente el nombre de tabla:

```js
// TablaDistritoLima.js
sequelize.define('TablaDistritoLima', { ... }, {
  tableName: 'TablaDistritosLima',  // ← la tabla real tiene "s"
  timestamps: false
});
```

Esto funciona correctamente porque Sequelize usa `tableName` para las queries. El nombre del modelo (`'TablaDistritoLima'`) solo se usa para referencias en asociaciones y en `require()`. No produce ningún error en runtime.

### Por qué importa

Cuando alguien busca el modelo por su nombre (`TablaDistritosLima`) en el código fuente, no lo encuentra (está como `TablaDistritoLima`). Genera confusión en búsquedas con `rg` o en referencias de código.

### Corrección (opcional, baja prioridad)

Unificar el nombre: o renombrar el modelo a `TablaDistritosLima` (con "s", para que coincida con la tabla) o documentar explícitamente el mismatch. Si se renueva el modelo, hay que actualizar el `require` en `district-times.service.js`, `models/index.js` y en los tests.

---

<a name="correcto"></a>
## Qué está correcto y bien implementado

Esta sección documenta las decisiones de implementación que son correctas, para tenerlas como referencia.

- **Arquitectura de servicios**: la separación `demand / worker / district-times / motor` respeta el diseño de la propuesta. Cada servicio tiene una responsabilidad clara.
- **Matriz ELEGIBILIDAD**: coincide exactamente con el spec en `04-deterministic-engine.md`.
- **Deduplicación A vs B**: la Fuente B (Programaciones pendientes) tiene precedencia sobre la Fuente A (MantenimientoFijo). Si un ascensor aparece en ambas, se usa el de B. Correcto.
- **Query batch en `obtenerFuenteA`**: en lugar de N queries (una por mantenimiento), hace una sola query masiva con `ascensor_id IN (...)`. Evita el N+1. Bien pensado.
- **Inicialización lazy de `DistrictTimesService`**: se inicializa una sola vez y se reutiliza. La asignación `_districtTimes = new DistrictTimesService()` ocurre antes del `await _districtTimes.init()`, lo que en Node.js (single-threaded) previene la creación de instancias duplicadas por requests concurrentes.
- **Asociaciones en `index.js`**: `DetalleRuta.belongsTo(Programacion)` y `Programacion.hasMany(DetalleRuta)` están correctamente declaradas con alias `'programacion'` y `'detallesRuta'`.
- **Rutas protegidas**: `authenticate` + `authorize('Administrador')` aplicados a nivel de router (no por ruta), lo que garantiza que ningún endpoint quede sin protección.
- **Montaje en `app.js`**: `app.use('/api/ia-scheduler', iaSchedulerRoutes)` — confirmado.
- **Tests del motor**: cobertura sólida de elegibilidad, prioridad, ventana horaria, clustering, preferencia de técnico, sin-elegible, traslados acumulados y estructura de respuesta. 14 casos de test bien escritos.
- **`nearestNeighbor`**: implementado correctamente con fallback a `DISTRITO_INICIO_DEFAULT` cuando el trabajo no tiene distrito.
- **Overflow detection**: la lógica base funciona — trabajos cuya `hora_fin > 18:30` se marcan y se separan de la respuesta principal. El Bug 2 de la Obs-2 es edge case.
- **Manejo de timezone**: uso consistente de `'T00:00:00-05:00'` para Lima (UTC-5). Correcto ya que Perú no observa DST.

---

## Prioridad de corrección

| # | Severidad | Descripción | Esfuerzo estimado |
|---|---|---|---|
| Bug 1 | Medio | Motor no recibe config de BD — ventana horaria no configurable | ~30 min |
| Bug 2 | Menor | `tecnico_preferido_respetado` siempre `false` | ~15 min |
| Obs 1 | Info | `getTecnicos` no usa instancia lazy de WorkerService | ~5 min |
| Obs 2 | Info | Overflow intermedio no propaga a trabajos subsiguientes | ~20 min |
| Obs 3 | Info | Tests de integración pasan con BD vacía | Fase 7 |
| Naming | Info | TablaDistritoLima vs TablaDistritosLima | ~10 min |
