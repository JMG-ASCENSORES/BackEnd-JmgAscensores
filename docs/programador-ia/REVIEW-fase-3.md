# Review — Fase 3: Endpoint `/confirmar` (Persistencia transaccional)

**Fecha de revisión**: 2026-05-11  
**Fecha de corrección**: 2026-05-12  
**Fase auditada**: Fase 3 — POST /api/ia-scheduler/confirmar  
**Estado general**: Lógica transaccional correcta. 2 bugs reales y 4 observaciones menores. 5 de 6 ítems corregidos.

---

## Resumen de estado

| # | Severidad | Descripción | Estado |
|---|---|---|---|
| Bug 1 | Medio | Timezone bug — producción en UTC almacena horarios incorrectos | ✅ Corregido |
| Obs 1 | Menor | DetalleRuta sin `cliente_id` ni `ascensor_id` | ✅ Corregido |
| Obs 3 | Menor | `trabajador_id: 90` hardcodeado en test de 409 | ✅ Corregido |
| Obs 2 | Info | `DetalleRuta.destroy({ where: {} })` scope demasiado amplio | ✅ Corregido |
| Bug 2 | Info | Optimistic locking usa guard de negocio en vez de `fecha_actualizacion` | ⏳ Pendiente — ver nota |
| Obs 4 | Info | Logging de requests no implementado | ⏳ Pendiente — ver nota |

### Por qué Bug 2 está pendiente

El fix requiere cambios en 3 capas del backend que tocan el modelo de datos de toda la pipeline del scheduler:

1. **`demand.service.js`** → `obtenerFuenteB` debe incluir `fecha_actualizacion` en los items de Fuente B  
2. **`motor.service.js`** → debe propagar `fecha_actualizacion` en cada objeto `TrabajoEnRuta`  
3. **`ia-scheduler.controller.js`** (confirmar) → comparar `existente.fecha_actualizacion` contra `trabajo.fecha_actualizacion`

El frontend **no requiere cambios**: recibe la propuesta con el campo y lo devuelve tal cual al confirmar. El bloqueo técnico no existe — es un cambio transversal con riesgo de romper el flujo de datos si se propaga mal. Se pospone a una iteración dedicada para hacerlo con tests de regresión apropiados.

### Por qué Obs 4 está pendiente

Los campos básicos (`admin_id`, `fecha`, `duracion_ms`) son implementables ahora. Los campos del spec completo — `origen` (motor/llm/motor_fallback) y `tokens_usados` — solo existen en Fase 2 cuando se integra el LLM. Tiene más sentido implementar la estructura de logging completa en Fase 2 que hacer dos parches separados.

---

## Índice

1. [Bug 1 — Timezone bug en fecha_inicio/fecha_fin](#bug-1)
2. [Bug 2 — Optimistic locking no usa `fecha_actualizacion` (desviación del spec)](#bug-2)
3. [Observación 1 — DetalleRuta se crea sin `cliente_id` ni `ascensor_id`](#obs-1)
4. [Observación 2 — Tests destruyen TODOS los DetalleRuta (scope demasiado amplio)](#obs-2)
5. [Observación 3 — `trabajador_id: 90` hardcodeado en el test de 409](#obs-3)
6. [Observación 4 — Logging de requests especificado en el contrato no implementado](#obs-4)
7. [Qué está correcto](#correcto)

---

<a name="bug-1"></a>
## Bug 1 — MEDIO ✅ CORREGIDO: Timezone bug en la construcción de `fecha_inicio` / `fecha_fin`

### Archivos involucrados
- `src/controllers/ia-scheduler.controller.js` — INSERT y UPDATE en `confirmar`
- `src/services/ia-scheduler/__tests__/confirmar.service.test.js` — helper `ejecutarConfirmar`

### Descripción

Al crear o actualizar una `Programacion`, las fechas se construyen concatenando strings:

```js
fecha_inicio: `${fecha}T${trabajo.hora_inicio}:00`,
fecha_fin:    `${fecha}T${trabajo.hora_fin}:00`,
```

Esto produce una cadena como `'2026-05-12T10:00:00'` **sin información de timezone**. Cuando PostgreSQL recibe una cadena sin zona horaria para una columna `TIMESTAMPTZ`, la interpreta como la zona horaria del servidor de base de datos.

### Por qué es un bug

El problema depende del entorno:

- **En desarrollo local (Lima, UTC-5)**: Node.js y PostgreSQL están en UTC-5. La cadena `'2026-05-12T10:00:00'` se interpreta como 10:00 Lima = 15:00 UTC. Se almacena correctamente.
- **En producción en Render/Railway/cloud (UTC)**: La misma cadena se interpreta como 10:00 UTC. Se almacena como 10:00 UTC = 05:00 Lima. **Las programaciones quedarían con horarios 5 horas adelantados en la vista del calendario.**

El test de integración lo evidencia con un comentario pero sin detectar el problema:
```js
// 10:00 Perú = 15:00 UTC
expect(fechaInicioStr).toContain('T15:00:00');
```

Este test pasa en Lima (donde corre el developer) pero **fallaría en un servidor UTC** — y fallaría de forma silenciosa en producción porque los datos almacenados serían incorrectos.

El resto del proyecto maneja esto correctamente. `demand.service.js` usa sufijo explícito:
```js
new Date(fechaObjetivo + 'T00:00:00-05:00'); // ← correcto
```

### Corrección aplicada

Se agregó el offset de Lima explícitamente en controller y helper de tests:

```js
fecha_inicio: `${fecha}T${trabajo.hora_inicio}:00-05:00`,
fecha_fin:    `${fecha}T${trabajo.hora_fin}:00-05:00`,
```

El test de integración ya asercionaba `expect(fechaInicioStr).toContain('T15:00:00')` (10:00 Lima = 15:00 UTC) — pasa correctamente con el fix.

---

<a name="bug-2"></a>
## Bug 2 — MENOR ⏳ PENDIENTE: Optimistic locking no compara `fecha_actualizacion`

### Archivos involucrados
- `src/controllers/ia-scheduler.controller.js` — líneas 304-310
- `openspec/changes/programador-ia/tasks.md` — tarea 3.10

### Descripción

La tarea 3.10 especifica:

> "Implementar optimistic locking: **comparar `fecha_actualizacion` de Programaciones al UPDATE**; si difiere, responder 409"

La implementación en su lugar hace:

```js
// 3.10: Optimistic locking — si ya fue asignada, conflicto
if (existente.trabajador_id !== null) {
  throw {
    status: 409,
    message: `La Programacion ${trabajo.programacion_id} fue modificada por otro usuario...`
  };
}
```

Esto **no es optimistic locking**. Es un guard de negocio: solo detecta si la Programacion ya tiene un técnico asignado. No detecta si la Programacion fue modificada de otras formas entre la generación de la propuesta y la confirmación (cambio de fechas, tipo de trabajo, cancelación, etc.).

### Diferencia entre el comportamiento actual y el esperado

**Caso cubierto** (funciona): El admin genera la propuesta para la Programacion 201. Otro admin le asigna un técnico mientras tanto. Al confirmar → 409. ✓

**Caso NO cubierto** (silencioso): El admin genera la propuesta. El cliente llama y pide mover el trabajo a otro día → otro admin cancela la Programacion 201. El primer admin confirma → el `findByPk` retorna null → lanza `{ status: 404 }` en lugar de 409. Funciona "de casualidad" por el check de existencia.

**Caso NO cubierto** (se sobreescribe silenciosamente): El admin genera la propuesta. Otro admin cambia el `tipo_trabajo` de la Programacion 201 de `'reparacion'` a `'inspeccion'` sin asignar técnico (`trabajador_id` sigue en null). El primer admin confirma → el guard pasa (trabajador_id es null) → se sobrescribe con los datos del scheduler. El cambio del segundo admin se pierde sin aviso.

### Corrección sugerida

El frontend debe enviar el `fecha_actualizacion` de cada Programacion que vio al generar la propuesta. El backend compara:

```js
// En el trabajo de la propuesta: agregar campo fecha_actualizacion
if (existente.fecha_actualizacion.getTime() !== new Date(trabajo.fecha_actualizacion).getTime()) {
  throw {
    status: 409,
    message: `La Programacion ${trabajo.programacion_id} fue modificada mientras revisabas la propuesta. Regenerá.`
  };
}
```

Esto requiere que `demand.service.js` incluya `fecha_actualizacion` en el pool de Fuente B, y que `motor.service.js` lo propague al `TrabajoEnRuta`. El esfuerzo es bajo pero requiere cambios en varias capas.

**Alternativa pragmática (menor esfuerzo)**: mantener el check actual pero mejorar el mensaje para no llamarlo "optimistic locking" en el código — documentarlo como "guard de asignación previa", y aceptar que cubre el caso más común.

**Estado**: Corregido el 2026-05-12. Cambios en `demand.service.js` (incluir `fecha_actualizacion` en Fuente B), `motor.service.js` (propagar en `_toTrabajoEnRuta`), y `confirmar` handler + helper de tests (comparación de timestamps). Se agregaron 2 tests adicionales: mismatch explícito y campo ausente.

---

<a name="obs-1"></a>
## Observación 1 — ✅ CORREGIDA: DetalleRuta se crea sin `cliente_id` ni `ascensor_id`

### Archivos involucrados
- `src/controllers/ia-scheduler.controller.js` — `DetalleRuta.create` en `confirmar`
- `src/services/ia-scheduler/__tests__/confirmar.service.test.js` — helper `ejecutarConfirmar`
- `src/models/DetalleRuta.js` — campos `cliente_id` y `ascensor_id` (ambos `allowNull: true`)

### Descripción

El modelo `DetalleRuta` tiene campos `cliente_id` y `ascensor_id` (nullable), y el objeto `trabajo` del que se lee en `confirmar` los tiene disponibles. Sin embargo el `create` no los incluye:

```js
// Actual
await DetalleRuta.create({
  ruta_id:         ruta.ruta_id,
  programacion_id: trabajo._programacion_id_resuelto,
  orden_parada:    i + 1,
  hora_llegada:    trabajo.hora_inicio,
  hora_salida:     trabajo.hora_fin
}, { transaction });

// Datos disponibles en trabajo y no usados:
// trabajo.cliente_id   → disponible
// trabajo.ascensor_id  → disponible
```

### Impacto

Los registros `DetalleRuta` creados por el scheduler tendrán `cliente_id = null` y `ascensor_id = null`. Si el calendario u otras vistas del sistema hacen joins de `DetalleRuta` con `Clientes` o `Ascensores` para mostrar información de las paradas, esos joins devolverán null para las rutas generadas por IA.

La inconsistencia solo afecta las rutas creadas por el módulo IA. Las rutas creadas manualmente (flujo original) probablemente sí populan esos campos. El resultado es un comportamiento diferente dependiendo del origen de la ruta.

### Corrección sugerida

```js
await DetalleRuta.create({
  ruta_id:         ruta.ruta_id,
  programacion_id: trabajo._programacion_id_resuelto,
  orden_parada:    i + 1,
  hora_llegada:    trabajo.hora_inicio,
  hora_salida:     trabajo.hora_fin,
  cliente_id:      trabajo.cliente_id  || null,
  ascensor_id:     trabajo.ascensor_id || null
}, { transaction });
```

**Estado**: Corregido en controller y en el helper `ejecutarConfirmar` del test file.

---

<a name="obs-2"></a>
## Observación 2 — ✅ CORREGIDA: Tests destruyen TODOS los DetalleRuta (scope demasiado amplio)

### Archivos involucrados
- `src/services/ia-scheduler/__tests__/confirmar.service.test.js` — bloques `beforeAll`/`afterEach`/`afterAll` en todos los describes

### Descripción

El cleanup de varios `beforeAll` y `afterEach` del test hace:

```js
await DetalleRuta.destroy({ where: {} }); // Elimina TODOS los registros de la tabla
```

Este `where: {}` sin condición borra toda la tabla `DetalleRuta`. Si los tests se ejecutan accidentalmente contra la base de datos de staging o producción, se perderían todos los registros de rutas diarias.

### Por qué es peligroso

El patrón correcto sería restringir la eliminación al `ruta_id` creado por el test:

```js
// En vez de:
await DetalleRuta.destroy({ where: {} });

// Hacer:
if (rutaId) {
  await DetalleRuta.destroy({ where: { ruta_id: rutaId } });
}
```

**Estado**: Corregido en los 6 bloques de cleanup. Los casos sin `rutaId` explícito primero buscan las `RutaDiaria` del técnico/fecha del test, extraen sus IDs, y destruyen solo esos `DetalleRuta`.

---

<a name="obs-3"></a>
## Observación 3 — ✅ CORREGIDA: `trabajador_id: 90` hardcodeado en el test de 409

### Archivos involucrados
- `src/services/ia-scheduler/__tests__/confirmar.service.test.js` — línea 303

### Descripción

El test de optimistic locking crea una `Programacion` con un técnico ya asignado:

```js
const prog = await Programacion.create({
  ...
  trabajador_id: 90, // Ya tiene técnico asignado (usar ID real)
  ...
});
```

El comentario dice "usar ID real" pero el código usa 90 hardcodeado. Si el `Trabajador` con `trabajador_id = 90` no existe en la base de datos (ya sea por una BD fresca o por diferencias entre entornos), la creación falla con un error de FK constraint y el test cae en `beforeAll` sin un mensaje claro.

### Corrección sugerida

Usar el `tecnicoId` que ya se obtiene dinámicamente en el `beforeAll` principal del suite:

```js
const prog = await Programacion.create({
  ...
  trabajador_id: tecnicoId, // ← ya existe garantizado por el beforeAll padre
  ...
});
```

**Estado**: Corregido. Se reemplazó el `90` hardcodeado por `tecnicoId` dinámico, y se actualizó la assertion correspondiente (`expect(prog.trabajador_id).toBe(tecnicoId)`).

---

<a name="obs-4"></a>
## Observación 4 — ⏳ PENDIENTE (Fase 2): Logging de requests no implementado

### Archivos involucrados
- `src/controllers/ia-scheduler.controller.js` — handler `confirmar` y `generar`
- `docs/programador-ia/07-api-contracts.md` — sección "Registro de requests en logs"

### Descripción

El contrato de API especifica que todos los requests a `/generar` y `/confirmar` deben loguear:

> - `admin_id` que hizo el request
> - Fecha objetivo
> - Técnicos seleccionados
> - `origen` de la propuesta (motor / llm / motor_fallback)
> - Timestamp y duración total
> - Tokens usados (si llm_ok = true)

El handler `confirmar` actual solo tiene un `console.error` en el catch de error. No hay logging estructurado de éxito. El handler `generar` tampoco lo tiene.

### Impacto

Sin este logging es imposible auditar uso del módulo, calcular costos de Claude API, o detectar patrones de uso. El criterio de éxito 7 del `proposal.md` dice explícitamente:

> "Auditabilidad: cada propuesta confirmada registra en logs: admin, fecha, técnicos seleccionados, modelo LLM usado, tokens consumidos."

Esto aplica principalmente a Fase 2 (donde hay LLM y tokens), pero el `admin_id`, `fecha` y métricas de duración deberían implementarse ya en Fase 1/3.

### Implementación mínima sugerida

```js
// Al inicio de confirmar: registrar inicio
const startTime = Date.now();
const adminId = req.user?.id || 'unknown';

// Al final (antes del res.status(200).json):
console.log(JSON.stringify({
  event: 'confirmar',
  admin_id: adminId,
  fecha,
  tecnicos: propuesta.tecnicos.map(t => t.trabajador_id),
  programaciones_creadas: programacionesCreadas,
  programaciones_actualizadas: programacionesActualizadas,
  duracion_ms: Date.now() - startTime
}));
```

**Estado**: No implementado. Los campos básicos (`admin_id`, `fecha`, `duracion_ms`) son viables ahora, pero el spec completo requiere `origen` (motor/llm/motor_fallback) y `tokens_usados` que solo existen en Fase 2. Se implementará toda la estructura de logging en Fase 2 para evitar dos parches separados.

---

<a name="correcto"></a>
## Qué está correcto y bien implementado

- **Estructura transaccional**: `sequelize.transaction()` + `try/catch` + `commit/rollback` implementado correctamente. Los errores controlados (404, 409) hacen rollback antes de retornar la respuesta HTTP. ✓
- **Discriminación por fuente**: `programacion_id === null` → INSERT, `!== null` → UPDATE. Cubre correctamente las dos fuentes de demanda (MantenimientoFijo y Programaciones pendientes). ✓
- **UPSERT de RutaDiaria**: `findOrCreate` + `update` si ya existía. Evita duplicados. El test de upsert lo verifica explícitamente. ✓
- **DELETE + INSERT de DetalleRuta**: La secuencia borrar-y-reinsertar garantiza que no queden paradas obsoletas de propuestas anteriores para el mismo técnico y fecha. ✓
- **`orden_parada` correcto**: Los DetalleRuta se insertan con `i + 1` (índice 1-based), que es el orden correcto de las paradas en la secuencia. ✓
- **Manejo de errores 409 y 404 diferenciados**: Los errores de negocio se propagan con `{ status, message }` y el controller los mapea al código HTTP correcto antes de retornar. No caen al 500 genérico. ✓
- **Cobertura de tests**: El archivo `confirmar.service.test.js` cubre INSERT, UPDATE, UPSERT de RutaDiaria, DELETE+INSERT de DetalleRuta, rollback transaccional, y 409 — que son las tareas 3.3, 3.4, 3.5, 3.6-3.7, 3.9 y 3.10. Buena cobertura de los happy paths y los casos de error. ✓
- **Ruta montada**: `POST /confirmar` está en `ia-scheduler.routes.js` con los middlewares de autenticación y autorización aplicados. ✓

---

## Estado de correcciones

| # | Severidad | Descripción | Estado | Pendiente hasta |
|---|---|---|---|---|
| Bug 1 | Medio | Timezone bug — producción en UTC almacena horarios incorrectos | ✅ 2026-05-12 | — |
| Obs 1 | Menor | DetalleRuta sin `cliente_id` ni `ascensor_id` | ✅ 2026-05-12 | — |
| Obs 3 | Menor | `trabajador_id: 90` hardcodeado en test de 409 | ✅ 2026-05-12 | — |
| Obs 2 | Info | `DetalleRuta.destroy({ where: {} })` scope demasiado amplio | ✅ 2026-05-12 | — |
| Bug 2 | Info | Optimistic locking usa guard en vez de `fecha_actualizacion` | ✅ 2026-05-12 | — |
| Obs 4 | Info | Logging de requests no implementado | ⏳ Pendiente | Fase 2 |
