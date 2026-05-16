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

**Objetivo**: el endpoint `/api/ia-scheduler/generar` responde con una evaluación de técnicos generada únicamente por el motor para un trabajo ad-hoc. Sin LLM aún. Sin frontend.
**Duración estimada**: 1–2 días.
**Dependencias**: Fase 0 completa.

### Estructura de archivos a crear

```
BackEnd-JmgAscensores/src/services/ia-scheduler/
  demand.service.js          ← enriquecimiento del trabajo + contexto MantenimientosFijos
  worker.service.js          ← query de técnicos + carga preexistente (trabajos_del_dia)
  district-times.service.js  ← carga TablaDistritosLima en memoria, expone getTiempo()
  motor.service.js           ← evaluación de técnicos para 1 trabajo (ver 04-deterministic-engine.md)

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
  - `enriquecerTrabajo(trabajoInput)` — JOIN Ascensores + Clientes para obtener distrito, tipo_equipo
  - `enriquecerConConfiguracion(trabajo)` — agrega duracion_min, prioridad de ConfiguracionIA
  - `obtenerContextoMantenimientos(fecha)` — MantenimientosFijos vencidos (solo para UI, no input al motor)
- [ ] Crear `worker.service.js`
  - `obtenerTecnicos(ids, fecha)` — datos + carga preexistente + `trabajos_del_dia` con horas
- [ ] Crear `motor.service.js` — evaluación de técnicos (ver `04-deterministic-engine.md`)
  - `validarInputs()`
  - `filtrarElegibles()` con ELEGIBILIDAD matrix
  - `calcularSlot(workItem, tecnico)` — mejor hueco disponible por técnico
  - `ordenarPorIdoneidad()` — por hora preferida, traslado, carga
  - `evaluarTecnicos()` — orquesta todo lo anterior
- [ ] Crear `ia-scheduler.controller.js`
  - GET `/demand` → lista de MantenimientosFijos vencidos (contexto UI)
  - GET `/tecnicos` → llama WorkerService
  - POST `/generar` → enriquecer trabajo + Motor únicamente (sin LLM), devuelve evaluacion_motor
  - POST `/confirmar` → implementar persistencia (ver `07-api-contracts.md`)
  - GET/PUT `/configuracion` → CRUD sobre ConfiguracionIA
- [ ] Crear `ia-scheduler.routes.js` con `authenticate` + `authorize('ADMIN')`
- [ ] Montar la ruta en `app.js`: `app.use('/api/ia-scheduler', iaSchedulerRoutes)`
- [ ] Escribir tests unitarios del motor (`motor.service.test.js`)
  - Ver casos de prueba en `04-deterministic-engine.md`

### Verificación (sin frontend)

```bash
# Con curl o Postman, autenticado como admin:
GET /api/ia-scheduler/demand?fecha=2026-05-13
GET /api/ia-scheduler/tecnicos?fecha=2026-05-13
POST /api/ia-scheduler/generar
  body: {
    "fecha": "2026-05-13",
    "trabajo": { "cliente_id": 45, "ascensor_id": 8, "tipo_trabajo": "mantenimiento" },
    "tecnico_ids": [1,2,3]
  }
  → debe devolver evaluacion con origen: "motor", sugerencia con slot calculado
```

### ⚠️ Completado en modo batch — 2026-05-11 — requiere adaptación a modo single-job

- **4 servicios implementados** (modo batch): `demand.service.js`, `worker.service.js`, `district-times.service.js`, `motor.service.js`.
- **5 endpoints**: `GET /demand`, `GET /tecnicos`, `POST /generar`, `GET /configuracion`, `PUT /configuracion`. Todos con `authenticate` + `authorize('ADMIN')` (corregido de 'Administrador').
- **71 tests**: 23 motor unitarios, 12 district-times, 17 demand (integración BD), 7 worker (integración BD), 12 smoke.
- **Pendiente**: adaptar `motor.service.js` de modo batch (múltiples trabajos → asignación a técnicos) a modo single-job (1 trabajo → evaluación de técnicos con slots). Los servicios de soporte (`district-times`, `worker`) no cambian.

---

## Fase 2 — Integración LLM (cascada automática)

**Objetivo**: el endpoint `/generar` ejecuta Motor → LLM en cascada. La respuesta incluye justificaciones del LLM por técnico.
**Duración estimada**: 1 día.
**Dependencias**: Fase 1 completa (modo single-job), `ANTHROPIC_API_KEY` configurada.

### Tareas

- [ ] Instalar dependencia: `npm install @anthropic-ai/sdk`
- [ ] Agregar al `.env`: `ANTHROPIC_API_KEY=sk-ant-...` y `IA_SCHEDULER_MODEL=claude-haiku-4-5-20251001`
- [ ] Crear `llm.service.js` (ver `05-llm-integration.md`)
  - Constante `SYSTEM_PROMPT` con el prompt completo (ver `05-llm-integration.md`)
  - `validarYJustificar(evaluacionMotor, instruccionAdmin)` con prompt caching
  - `parsearRespuesta(rawText, fallback)` — JSON parse + fallback al motor
  - `validarEvaluacion(evaluacion, trabajadoresMap)` — guard de restricciones duras
- [ ] Crear `scheduler.service.js` — orquestador de las 2 capas
  - `evaluarTecnicos(trabajoInput, tecnicoIds, fecha, instruccionAdmin)`:
    1. DemandService.enriquecerTrabajo(trabajoInput)
    2. WorkerService.obtenerTecnicos(ids, fecha)
    3. MotorService.evaluarTecnicos(workItem, tecnicos) → evaluacion_motor
    4. LLMService.validarYJustificar(evaluacion_motor, instruccionAdmin) → evaluacion_final
    5. Si LLM falla: evaluacion_motor con origen = 'motor_fallback'
    6. Retornar evaluacion_final
- [ ] Actualizar `ia-scheduler.controller.js`:
  - POST `/generar` → ahora llama SchedulerService (Motor + LLM)
  - POST `/ajustar` → LLMService.ajustarConInstruccion(sugerenciaActual, instruccion)
- [ ] Agregar manejo de timeout para llamadas al LLM (10s máximo)
- [ ] Agregar logging de uso (tokens, modelo, duración, admin_id)

### Verificación

```bash
POST /api/ia-scheduler/generar
  body: {
    "fecha": "2026-05-13",
    "trabajo": { "cliente_id": 45, "ascensor_id": 8, "tipo_trabajo": "mantenimiento" },
    "tecnico_ids": [1,2,3],
    "instruccion_admin": null
  }
  → origen debe ser "llm"
  → sugerencia y alternativas deben tener justificacion no nula

POST /api/ia-scheduler/ajustar
  body: { "sugerencia_actual": {...}, "instruccion": "no me des a Carlos" }
  → sugerencia actualizada con la instrucción aplicada
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

### ✅ Completado (modo batch) — 2026-05-11 — requiere simplificación para modo single-job

- **Handler `confirmar`** (modo batch): transacción Sequelize atómica, INSERT Programacion para MantenimientoFijo, UPDATE para pendientes (eliminado en nuevo diseño — solo INSERT), optimistic locking por `fecha_actualizacion`, findOrCreate + update para RutaDiaria, DELETE + INSERT para DetalleRuta.
- **12 tests de integración**: INSERT nuevas, conflicto 409, rollback ante error, UPSERT RutaDiaria, reemplazo DetalleRuta, estructura de respuesta, fechas con timezone.
- **Pendiente**: simplificar el handler para el nuevo diseño (siempre INSERT, nunca UPDATE — el nuevo trabajo no existe aún en la BD).

---

## Fase 4 — Frontend: componente base + formulario

**Objetivo**: reemplazar el placeholder `ai-assistant` con el componente real. El admin puede definir un trabajo usando el formulario (cliente, ascensor, tipo, fecha, hora preferida). Sin sugerencia todavía — la respuesta puede mostrarse como JSON en un `<pre>`.
**Duración estimada**: 1 día.
**Dependencias**: Fase 1 adaptada a modo single-job.

### Tareas

- [ ] Reemplazar contenido de `ai-assistant.component.ts` con `AiAssistantComponent` en modo formulario
- [ ] Crear `IaSchedulerService` en `src/app/core/services/ia-scheduler.service.ts`
  - Métodos: `getDemand()`, `getTecnicos()`, `generar()`, `ajustar()`, `confirmar()`
- [ ] Crear interfaces TypeScript en `src/app/features/admin/models/ia-scheduler.interface.ts`
  - `SugerenciaResponse`, `SlotSugerido`, `WorkItemEnriquecido`, `DemandInfo`, `TecnicoConCarga`, etc.
- [ ] Implementar `AiSchedulerFormComponent`
  - Selector de fecha, selector de cliente, selector de ascensor (filtrado por cliente), selector de tipo de trabajo, campo de hora preferida opcional
  - Botón "Buscar técnico óptimo" deshabilitado si faltan campos obligatorios
- [ ] Al cargar el componente: llamar `getDemand()` y `getTecnicos()` en paralelo (para contexto de mantenimientos vencidos)
- [ ] Mostrar lista de mantenimientos vencidos con botón "Programar este" para prellenar el formulario

### Verificación visual

- El admin ve el formulario con todos los campos.
- El badge "X mantenimientos vencen mañana" refleja datos reales.
- Al completar los campos y hacer click en "Buscar técnico óptimo", el spinner aparece.
- La respuesta del motor/LLM aparece en un `<pre>` (el panel de sugerencia se completa en Fase 5).

### ✅ Completado en modo batch — 2026-05-16 — requiere redesign a formulario

- **Componente actual (modo batch)**: chips de técnicos + selector de fecha + botón "Generar propuesta" que lee un pool de la BD. No es el diseño final.
- **Servicio**: `IaSchedulerService` con 7 métodos REST tipados — válido para el nuevo diseño, solo cambian los tipos de request/response en generar/confirmar.
- **Interfaces**: 18 interfaces TypeScript — requieren actualización para reflejar `SugerenciaResponse` y `SlotSugerido`.
- **Pendiente**: reemplazar el selector de técnicos (chips) por el formulario de trabajo (cliente + ascensor + tipo + hora preferida).

---

## Fase 4R — Redesign frontend: formulario individual

**Objetivo**: reemplazar el componente batch (selector de técnicos + pool) por el formulario ad-hoc (cliente + ascensor + tipo + fecha + hora preferida). Esta fase reemplaza la implementación de Fase 4 que está en modo batch.
**Duración estimada**: 1 día.
**Dependencias**: Fase 4 completada (infraestructura: servicio, ruta, interfaces).

### Tareas

- [ ] Reescribir `ai-assistant.component.ts` para usar `SchedulerState` con modo formulario
  - Reemplazar signals de `selectedTecnicos`, `demandaInfo` por `selectedClienteId`, `selectedAscensorId`, `selectedTipo`, `horaPreferida`, `mantenimientoFijoIdContexto`
  - Cambiar estado `'propuesta_lista'` a `'sugerencia_lista'`
- [ ] Crear `AiSchedulerFormComponent` — formulario de definición del trabajo (ver `08-frontend-ux.md`)
- [ ] Crear `AiSchedulerDemandContextComponent` — lista de mantenimientos vencidos con prellenado
- [ ] Actualizar interfaces en `ia-scheduler.interface.ts` para reflejar nuevo schema de API:
  - `GenerarRequest`: `{ fecha, trabajo: { cliente_id, ascensor_id, tipo_trabajo, hora_preferida }, tecnico_ids }`
  - `SugerenciaResponse`: `{ sugerencia, alternativas, trabajo, sin_elegible, ... }`
  - `SlotSugerido`: `{ trabajador_id, nombre, apellido, hora_inicio, hora_fin, traslado_min, ... }`
  - `ConfirmarRequest`: `{ fecha, trabajo: {..., hora_inicio, hora_fin}, tecnico_id, mantenimiento_fijo_id? }`
- [ ] Cargar lista de clientes y ascensores para los selectores del formulario
  - `GET /api/clientes` + `GET /api/ascensores?cliente_id={id}`

---

## Fase 5 — Frontend: panel de sugerencia + alternativas + confirmar

**Objetivo**: mostrar la sugerencia del LLM con su justificación, la lista de alternativas ordenadas, y permitir al admin confirmar cualquiera de ellas.
**Duración estimada**: 1 día.
**Dependencias**: Fase 4R.

### Tareas

- [ ] Implementar `AiSchedulerSuggestionComponent` (ver `08-frontend-ux.md`)
  - Sugerencia principal destacada (técnico + slot + justificación del LLM)
  - Lista de alternativas con slot y botón "Elegir"
  - Banner de `origen: 'motor_fallback'` si el LLM no respondió
  - Banner de `sin_elegible: true` con mensaje explicativo
  - Banner de `advertencias` si el LLM hizo correcciones
- [ ] Implementar confirmación
  - Botón "Confirmar con [nombre]" en la sugerencia principal
  - Botón "Elegir" en cada alternativa
  - Llamada a `POST /confirmar` con el técnico elegido + slot calculado
  - Toast de éxito: "Programación creada — [nombre], [hora_inicio]–[hora_fin]"
  - Limpiar formulario para el siguiente trabajo (no redirigir)

### Verificación visual

- La sugerencia principal se muestra claramente con su justificación.
- Las alternativas listan el slot calculado para cada técnico.
- El banner de fallback aparece cuando el LLM no está disponible.
- El admin puede confirmar y ve el toast de éxito sin recargar la página.

---

## Fase 6 — Frontend: chat de ajustes

**Objetivo**: el panel de chat permite al admin refinar la sugerencia en lenguaje natural ("no me des a Carlos, está saturado hoy").
**Duración estimada**: 4–6 horas.
**Dependencias**: Fase 5, Fase 2.

### Tareas

- [ ] Implementar `AiSchedulerChatComponent` (ver `08-frontend-ux.md`)
  - Input de texto + botón enviar + Enter para enviar
  - Historial de mensajes (solo UX, no se acumula como conversación en el LLM)
  - Spinner "Ajustando sugerencia..."
- [ ] Al enviar instrucción: llamar `/ajustar` con sugerencia actual + instrucción
- [ ] Actualizar `sugerenciaActual` signal con la respuesta — el panel se re-renderiza automáticamente
- [ ] El chat solo aparece cuando `state === 'sugerencia_lista'`

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
   └── Fase 1 (motor — modo single-job)  ← adaptar lo implementado
          ├── Fase 2 (LLM cascade)
          │      └── Fase 6 (chat frontend)
          ├── Fase 3 (confirmar — simplificar a 1 INSERT) ← adaptar lo implementado
          │      └── Fase 5 (panel sugerencia + confirmar)
          │             └── Fase 6
          └── Fase 4 (frontend base) ✅ → Fase 4R (redesign a formulario)
                 └── Fase 5
                        └── Fase 6
                               └── Fase 7 (testing)
```

---

## Estimación total

| Fase | Duración estimada | Bloqueante para | Estado |
|---|---|---|---|
| 0 — Migraciones | 2–4h | Todo | ✅ Completada |
| 1 — Motor (adaptar a single-job) | 1 día | Fases 2, 3, 4R | ⚠️ Requiere adaptación |
| 2 — LLM | 1 día | Fase 6 | 🔲 Pendiente |
| 3 — Confirmar (simplificar) | 2–4h | Fase 5 | ⚠️ Requiere simplificación |
| 4 — Frontend base | — | — | ✅ Completada (modo batch) |
| 4R — Redesign a formulario | 1 día | Fase 5 | 🔲 Pendiente |
| 5 — Panel sugerencia + confirmar | 1 día | Fase 6 | 🔲 Pendiente |
| 6 — Chat | 4–6h | Fase 7 | 🔲 Pendiente |
| 7 — Testing | 2–5 días | — | 🔲 Pendiente |
| **Total completado** | **~3–4 días** | | **Infraestructura base** |
| **Total restante** | **~5–8 días** | | **Motor + LLM + Frontend** |

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
