# Plan de Implementación por Fases — Programador IA

## Principios del plan

1. **Cada fase es entregable y testeable de forma aislada** antes de pasar a la siguiente.
2. **Fase 0 y 1 primero, siempre**: sin migraciones y sin motor, nada más funciona.
3. **El LLM se agrega en Fase 2** — la Fase 1 ya entrega valor (propuesta del motor sin IA).
4. **Frontend llega en Fase 4–6** — los endpoints de la API deben existir antes.
5. Las fases 4, 5 y 6 pueden avanzar en paralelo con la Fase 2 si hay dos personas trabajando.

---

## Fase 0 — Migraciones de base de datos

**Objetivo**: preparar el esquema sin romper nada existente.
**Duración estimada**: 2–4 horas.
**Dependencias**: ninguna.

### Tareas

- [ ] Ejecutar **Migración 1**: `ALTER TABLE DetalleRuta ADD COLUMN programacion_id, orden_parada`
- [ ] Ejecutar **Migración 2**: `CREATE TABLE ConfiguracionIA` + seed de 4 filas
- [ ] Ejecutar **Migración 3**: `CREATE TABLE TablaDistritosLima`
- [ ] Crear script `scripts/seed-district-times.sql` con los 380 pares de distritos (20×20 - diagonal)
  - Ver valores en `06-district-time-matrix.md`
  - Incluir inserts para mismo distrito con tiempo = 0 (el servicio aplica mínimo 15)
- [ ] Ejecutar el seed de `TablaDistritosLima`
- [ ] Crear archivos de modelo Sequelize: `ConfiguracionIA.js`, `TablaDistritoLima.js`
- [ ] Actualizar `src/models/index.js`:
  - Importar los dos modelos nuevos
  - Agregar asociación `DetalleRuta.belongsTo(Programacion, { foreignKey: 'programacion_id' })`
  - Agregar asociación `Programacion.hasMany(DetalleRuta, { foreignKey: 'programacion_id' })`

### Verificación

```sql
-- Verificar que los cambios están en producción
DESCRIBE DetalleRuta;              -- debe mostrar programacion_id, orden_parada
SELECT COUNT(*) FROM ConfiguracionIA;  -- debe ser 4
SELECT COUNT(*) FROM TablaDistritosLima; -- debe ser 420 (20×20 + diagonales)
```

### ✅ Completado — 2026-05-11

- **Adaptación PostgreSQL**: migraciones usan `SERIAL` (no `AUTO_INCREMENT`), `TIMESTAMP WITH TIME ZONE`, sin `ENGINE`. Aplicadas vía `sequelize.sync({ alter: true })` además de los archivos SQL para trazabilidad.
- **Seed**: 4 filas en `ConfiguracionIA`, 400 pares en `TablaDistritosLima` (matriz 20×20 completa).
- **Modelos Sequelize**: `ConfiguracionIA.js`, `TablaDistritoLima.js`, asociaciones `DetalleRuta ↔ Programacion`.
- **Smoke test**: 20 modelos cargan sin errores.

---

## Fase 1 — Motor determinista (backend puro)

**Objetivo**: el endpoint `/api/ia-scheduler/generar` responde con una propuesta generada únicamente por el motor. Sin LLM aún. Sin frontend.
**Duración estimada**: 1–2 días.
**Dependencias**: Fase 0 completa.

### Estructura de archivos a crear

```
BackEnd-JmgAscensores/src/services/ia-scheduler/
  demand.service.js          ← queries de demanda (Fuentes A y B)
  worker.service.js          ← query de técnicos + carga preexistente
  district-times.service.js  ← carga TablaDistritosLima en memoria, expone getTiempo()
  motor.service.js           ← algoritmo completo (ver 04-deterministic-engine.md)

BackEnd-JmgAscensores/src/controllers/
  ia-scheduler.controller.js ← maneja los endpoints

BackEnd-JmgAscensores/src/routes/
  ia-scheduler.routes.js     ← monta los endpoints + middleware admin
```

### Tareas

- [ ] Crear `district-times.service.js`
  - Al iniciar, carga toda `TablaDistritosLima` en un Map en memoria
  - Método: `getTiempo(origen, destino) → number`
  - Fallback 90 si el par no existe; 15 si origen === destino
- [ ] Crear `demand.service.js`
  - `obtenerFuenteA(fecha)` — MantenimientosFijos vencidos (query completa en `03-demand-sources.md`)
  - `obtenerFuenteB(fecha)` — Programaciones pendientes sin técnico
  - `deduplicar(A, B)` — evitar duplicados por ascensor_id
  - `enriquecerConConfiguracion(items)` — agrega duracion_min, prioridad, tecnicos_requeridos
- [ ] Crear `worker.service.js`
  - `obtenerTecnicos(ids, fecha)` — datos + carga preexistente para el día
- [ ] Crear `motor.service.js` — algoritmo completo (ver `04-deterministic-engine.md`)
  - `validarInputs()`
  - `ordenarPorPrioridad()`
  - `asignarTecnicos()` con elegibilidad y greedy balanceado
  - `secuenciarParadas()` con nearest-neighbor
  - `calcularHorarios()` con ventana 8:30–18:30
  - `procesarOverflow()`
  - `generarPropuesta()` — orquesta todo lo anterior
- [ ] Crear `ia-scheduler.controller.js`
  - GET `/demand` → llama DemandService
  - GET `/tecnicos` → llama WorkerService
  - POST `/generar` → Motor únicamente (sin LLM todavía), devuelve propuesta_motor como respuesta
  - POST `/confirmar` → implementar persistencia (ver `07-api-contracts.md`)
  - GET/PUT `/configuracion` → CRUD sobre ConfiguracionIA
- [ ] Crear `ia-scheduler.routes.js` con `authMiddleware` + `requireRole('admin')`
- [ ] Montar la ruta en `app.js`: `app.use('/api/ia-scheduler', iaSchedulerRoutes)`
- [ ] Escribir tests unitarios del motor (`motor.service.test.js`)
  - Ver casos de prueba en `04-deterministic-engine.md`

### Verificación (sin frontend)

```bash
# Con curl o Postman, autenticado como admin:
GET /api/ia-scheduler/demand?fecha=2026-05-13
GET /api/ia-scheduler/tecnicos?fecha=2026-05-13
POST /api/ia-scheduler/generar
  body: { "fecha": "2026-05-13", "tecnico_ids": [1,2,3] }
   → debe devolver propuesta con origen: "motor"
```

### ✅ Completado — 2026-05-11

- **4 servicios**: `demand.service.js` (pool de 2 fuentes + dedup), `worker.service.js` (técnicos + carga preexistente), `district-times.service.js` (400 pares en Map), `motor.service.js` (466 líneas, 7 pasos del algoritmo).
- **5 endpoints**: `GET /demand`, `GET /tecnicos`, `POST /generar`, `GET /configuracion`, `PUT /configuracion`. Todos con `authenticate` + `authorize('Administrador')`.
- **71 tests**: 23 motor unitarios, 12 district-times, 17 demand (integración BD), 7 worker (integración BD), 12 smoke (supertest).
- **Bugs corregidos**: ventana horaria ahora lee `ConfiguracionIA` de BD (no hardcodeada), `tecnico_preferido_respetado` se setea correctamente, overflow se propaga a trabajos subsiguientes, `getTecnicos` usa instancia lazy.
- **Review**: `REVIEW-fase-0-1.md` documenta hallazgos y correcciones. Validado con `npx jest` (71/71 ✅).

---

## Fase 2 — Integración LLM (cascada automática)

**Objetivo**: el endpoint `/generar` ejecuta Motor → LLM en cascada. La respuesta incluye justificaciones del LLM.
**Duración estimada**: 1 día.
**Dependencias**: Fase 1 completa, `ANTHROPIC_API_KEY` configurada.

### Tareas

- [ ] Instalar dependencia: `npm install @anthropic-ai/sdk`
- [ ] Agregar al `.env`: `ANTHROPIC_API_KEY=sk-ant-...` y `IA_SCHEDULER_MODEL=claude-haiku-4-5-20251001`
- [ ] Crear `llm.service.js` (ver `05-llm-integration.md`)
  - Constante `SYSTEM_PROMPT` con el prompt completo (ver `05-llm-integration.md`)
  - `ajustarPropuesta(propuestaMotor, instruccionAdmin)` con prompt caching
  - `parsearRespuesta(rawText, fallback)` — JSON parse + fallback al motor
  - `validarPropuesta(propuesta, trabajadoresMap)` — guard de restricciones duras
- [ ] Crear `scheduler.service.js` — orquestador de las 2 capas
  - `generarPropuesta(tecnicoIds, fecha, instruccionAdmin)`:
    1. DemandService.obtenerPool(fecha)
    2. WorkerService.obtenerTecnicos(ids, fecha)
    3. MotorService.generarPropuesta(pool, tecnicos) → propuesta_motor
    4. LLMService.ajustarPropuesta(propuesta_motor, instruccionAdmin) → propuesta_final
    5. Si LLM falla: propuesta_motor con origen = 'motor_fallback'
    6. Retornar propuesta_final
- [ ] Actualizar `ia-scheduler.controller.js`:
  - POST `/generar` → ahora llama SchedulerService (Motor + LLM)
  - POST `/ajustar` → LLMService.ajustarConInstruccion(propuestaActual, instruccion)
- [ ] Agregar manejo de timeout para llamadas al LLM (10s máximo)
- [ ] Agregar logging de uso (tokens, modelo, duración, admin_id)

### Verificación

```bash
POST /api/ia-scheduler/generar
  body: { "fecha": "2026-05-13", "tecnico_ids": [1,2,3], "instruccion_admin": null }
  → origen debe ser "llm"
  → trabajos deben tener justificacion no nula

POST /api/ia-scheduler/ajustar
  body: { "propuesta_actual": {...}, "instruccion": "priorizá emergencias" }
  → propuesta modificada con las instrucciones aplicadas
```

---

## Fase 3 — Endpoint `/confirmar` (persistencia)

**Objetivo**: al confirmar, se crean/actualizan Programaciones, RutasDiarias y DetalleRuta correctamente.
**Duración estimada**: 4–8 horas.
**Dependencias**: Fase 1 (el modelo de propuesta debe estar definido).

### Tareas

- [ ] Implementar lógica de confirmación en `ia-scheduler.controller.js`
  - Ver implementación detallada en `07-api-contracts.md` (sección endpoint `/confirmar`)
  - Transacción Sequelize con commit/rollback
  - INSERT Programacion nueva (para MantenimientoFijo)
  - UPDATE Programacion existente (para pendientes)
  - UPSERT RutaDiaria (un registro por técnico)
  - DELETE + INSERT DetalleRuta (con programacion_id y orden_parada)
- [ ] Manejar caso de conflicto: si una Programacion fue modificada externamente entre la generación y la confirmación (optimistic locking con `fecha_actualizacion`)
- [ ] Test de integración: confirmar una propuesta y verificar el estado en la BD

### Verificación

```bash
POST /api/ia-scheduler/confirmar
  body: { "fecha": "2026-05-13", "propuesta": { ... } }
  → { "ok": true, "programaciones_creadas": 5, "programaciones_actualizadas": 2, "rutas_generadas": 3 }
# Verificar en BD:
SELECT * FROM Programaciones WHERE DATE(fecha_inicio) = '2026-05-13';
SELECT * FROM RutasDiarias WHERE fecha_ruta = '2026-05-13';
SELECT dr.* FROM DetalleRuta dr JOIN RutasDiarias rd ON rd.ruta_id = dr.ruta_id
  WHERE rd.fecha_ruta = '2026-05-13' ORDER BY rd.trabajador_id, dr.orden_parada;
```

### ✅ Completado — 2026-05-11

- **Handler `confirmar`**: 140 líneas con transacción Sequelize atómica. INSERT Programacion para MantenimientoFijo, UPDATE para pendientes, optimistic locking (409 si `trabajador_id !== null`), findOrCreate + update para RutaDiaria, DELETE + INSERT para DetalleRuta con `programacion_id` y `orden_parada`.
- **Optimistic locking**: verifica `trabajador_id !== null` en la Programacion existente antes del UPDATE. Si ya fue asignada por otro admin, retorna 409 con mensaje descriptivo.
- **10 tests de integración**: INSERT nuevas, UPDATE existentes, conflicto 409, rollback ante error, UPSERT RutaDiaria, reemplazo DetalleRuta, estructura de respuesta, fechas con timezone.
- **Endpoint**: `POST /api/ia-scheduler/confirmar` montado en rutas con auth + rol admin. Response: `{ ok, programaciones_creadas, programaciones_actualizadas, rutas_generadas }`.

---

## Fase 4 — Frontend: componente base + selector

**Objetivo**: reemplazar el placeholder `ai-assistant` con el componente real. El admin puede seleccionar técnicos y fecha. Sin propuesta todavía.
**Duración estimada**: 1 día.
**Dependencias**: Fase 1 (para que los endpoints `/demand` y `/tecnicos` respondan).

### Tareas

- [ ] Reemplazar contenido de `ai-assistant.component.ts` con el nuevo `AiSchedulerComponent`
- [ ] Crear `IaSchedulerService` en `src/app/core/services/ia-scheduler.service.ts`
  - Métodos: `getDemand()`, `getTecnicos()`, `generar()`, `ajustar()`, `confirmar()`
- [ ] Crear interfaces TypeScript en `src/app/features/admin/models/ia-scheduler.interface.ts`
  - `Propuesta`, `TecnicoPropuesta`, `TrabajoEnRuta`, `WorkItem`, `DemandInfo`, etc.
- [ ] Implementar `AiSchedulerHeaderComponent` (selector de fecha + chips de técnicos + botón generar)
- [ ] Al cargar el componente: llamar `getDemand()` y `getTecnicos()` en paralelo
- [ ] Botón "Generar" deshabilitado si no hay técnicos seleccionados

### Verificación visual

- El admin ve los chips de técnicos activos.
- El badge "X trabajos pendientes" refleja la demanda real de mañana.
- Al seleccionar técnicos y hacer click en "Generar", el spinner aparece (aunque la propuesta no se muestre todavía — en esta fase puede ser un JSON en un `<pre>`).

---

## Fase 5 — Frontend: timeline view

**Objetivo**: mostrar la propuesta generada en forma de timeline visual por técnico.
**Duración estimada**: 1–2 días.
**Dependencias**: Fase 4.

### Tareas

- [ ] Implementar `AiSchedulerTimelineComponent` (ver `08-frontend-ux.md`)
  - Barra de timeline proporcional (8:30–18:30 = 100%)
  - Bloques de colores por tipo de trabajo
  - Lista de paradas expandida debajo de cada barra
  - Mostrar justificación del LLM en cada parada
- [ ] Implementar sección de overflow con banner ⚠
- [ ] Implementar banner de `origen: 'motor_fallback'`
- [ ] Implementar banners de advertencias
- [ ] Implementar `AiSchedulerFooterComponent` con botón "Confirmar"
  - Confirm dialog antes de confirmar
  - Llamada a `/confirmar` + toast de éxito
  - Redirect al calendario tras confirmación exitosa

### Verificación visual

- El timeline se renderiza correctamente con colores por tipo.
- Los horarios son correctos (no se solapan visualmente).
- El overflow aparece claramente separado.
- El admin puede confirmar y ve el toast de éxito.

---

## Fase 6 — Frontend: chat de ajustes

**Objetivo**: el panel de chat permite al admin refinar la propuesta en lenguaje natural.
**Duración estimada**: 4–6 horas.
**Dependencias**: Fase 5, Fase 2.

### Tareas

- [ ] Implementar `AiSchedulerChatComponent` (ver `08-frontend-ux.md`)
  - Input de texto + botón enviar + Enter para enviar
  - Historial de mensajes (solo UX, no se envía al LLM)
  - Spinner "Ajustando propuesta..."
- [ ] Al enviar instrucción: llamar `/ajustar` con propuesta actual + instrucción
- [ ] Actualizar `propuestaActual` signal con la respuesta
- [ ] El timeline se re-renderiza automáticamente con los cambios (reactivo via signal)
- [ ] Indicar visualmente cuáles paradas cambiaron (opcional v1 — diff highlighting)

---

## Fase 7 — Testing, ajuste de prompts y refinamiento

**Objetivo**: validar el flujo completo con datos reales y ajustar el system prompt según los resultados.
**Duración estimada**: 2–5 días (iterativo).
**Dependencias**: Fases 1–6 completas.

### Actividades

- [ ] Test con datos reales de al menos 5 días de programación histórica
  - Comparar propuesta del sistema vs lo que hizo el admin manualmente
  - ¿El sistema hubiera llegado a una propuesta similar o mejor?
- [ ] Ajustar system prompt si el LLM hace asignaciones subóptimas
  - Agregar ejemplos de few-shot si hay patrones específicos del negocio
  - Refinar el prompt de roles/especialidades según feedback del admin
- [ ] Ajustar tabla de tiempos de distritos si los tiempos reales son sistemáticamente distintos
- [ ] Ajustar duraciones por tipo en `ConfiguracionIA` si los tiempos estimados no coinciden con la realidad
- [ ] Prueba de carga: ¿qué pasa si hay 20 trabajos y 5 técnicos? ¿el context del LLM es manejable?
- [ ] Test del modo fallback: desconectar la API de Anthropic y verificar que el motor solo funciona

---

## Resumen de dependencias entre fases

```
Fase 0 (migraciones) ✅
   └── Fase 1 (motor) ✅
          ├── Fase 2 (LLM cascade)
          │      └── Fase 6 (chat frontend)
          ├── Fase 3 (confirmar) ✅
          │      └── Fase 5 (timeline + confirmar frontend)
          │             └── Fase 6
          └── Fase 4 (frontend base)
                 └── Fase 5
                        └── Fase 6
                               └── Fase 7 (testing)
```

---

## Estimación total

| Fase | Duración estimada | Bloqueante para | Estado |
|---|---|---|---|
| 0 — Migraciones | 2–4h | Todo | ✅ Completada |
| 1 — Motor | 1–2 días | Fases 2, 3, 4 | ✅ Completada |
| 2 — LLM | 1 día | Fase 6 | 🔲 Pendiente |
| 3 — Confirmar | 4–8h | Fase 5 | ✅ Completada |
| 4 — Frontend base | 1 día | Fase 5 | 🔲 Pendiente |
| 5 — Timeline | 1–2 días | Fase 6 | 🔲 Pendiente |
| 6 — Chat | 4–6h | Fase 7 | 🔲 Pendiente |
| 7 — Testing | 2–5 días | — | 🔲 Pendiente |
| **Total completado** | **~4–5 días** | | **65/173 tasks (38%)** |
| **Total restante** | **~5–9 días** | | **108 tasks pendientes** |

---

## Variables de entorno requeridas al finalizar

```env
# BackEnd-JmgAscensores/.env
ANTHROPIC_API_KEY=sk-ant-...
IA_SCHEDULER_MODEL=claude-haiku-4-5-20251001
IA_SCHEDULER_TIMEOUT_MS=10000
IA_SCHEDULER_ENABLED=true
```

---

## Checklist de "done" para cada fase

Una fase está **done** cuando:
1. El código está escrito y los tests pasan.
2. Se probó manualmente con datos reales (no solo mock).
3. Los errores posibles tienen manejo claro (no pantalla en blanco).
4. La documentación en este directorio refleja cualquier cambio de diseño descubierto durante la implementación.
