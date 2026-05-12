# Tasks: programador-ia

Checklist atómico de implementación. Cada tarea es lo suficientemente pequeña para completarse en un solo commit. Marcar `[x]` cuando esté hecha. Las dependencias entre tareas están implícitas por el orden — no saltearse fases.

> Fuente de detalle técnico: `docs/programador-ia/` (en el mismo repo). Cada tarea referencia el archivo correspondiente cuando aplica.

---

## Fase 0 — Migraciones de base de datos

Ref: `docs/programador-ia/09-database-migrations.md`.

### Migración de schema

- [x] 0.1 Crear archivo `scripts/migrations/001-detalle-ruta-programacion-id.sql` con `ALTER TABLE DetalleRuta ADD COLUMN programacion_id` + `ADD COLUMN orden_parada` + índices
- [x] 0.2 Crear archivo `scripts/migrations/002-configuracion-ia.sql` con `CREATE TABLE ConfiguracionIA`
- [x] 0.3 Crear archivo `scripts/migrations/003-tabla-distritos-lima.sql` con `CREATE TABLE TablaDistritosLima`
- [x] 0.4 Ejecutar las 3 migraciones en BD de desarrollo
- [x] 0.5 Verificar con `DESCRIBE` que el schema es el esperado

### Seeds

- [x] 0.6 Crear `scripts/seeds/seed-configuracion-ia.sql` con las 4 filas iniciales (emergencia=90, reparacion=120, inspeccion=45, mantenimiento=60)
- [x] 0.7 Crear `scripts/seeds/seed-tabla-distritos-lima.sql` con los ~420 pares de distritos (matriz 20×20 simétrica completa) — usar los valores de `docs/programador-ia/06-district-time-matrix.md`
- [x] 0.8 Ejecutar los seeds en dev
- [x] 0.9 Verificar `SELECT COUNT(*) FROM TablaDistritosLima` ≥ 420 y `SELECT COUNT(*) FROM ConfiguracionIA` = 4

### Modelos Sequelize

- [x] 0.10 Crear `src/models/ConfiguracionIA.js`
- [x] 0.11 Crear `src/models/TablaDistritoLima.js`
- [x] 0.12 Editar `src/models/index.js`: importar los 2 modelos nuevos
- [x] 0.13 Editar `src/models/index.js`: agregar `DetalleRuta.belongsTo(Programacion, { foreignKey: 'programacion_id', as: 'programacion' })`
- [x] 0.14 Editar `src/models/index.js`: agregar `Programacion.hasMany(DetalleRuta, { foreignKey: 'programacion_id', as: 'detallesRuta' })`
- [x] 0.15 Smoke test: `node -e "require('./src/models')"` no debe lanzar error

---

## Fase 1 — Motor determinista (backend, sin LLM)

Ref: `docs/programador-ia/04-deterministic-engine.md`, `03-demand-sources.md`.

### Servicios auxiliares

- [x] 1.1 Crear `src/services/ia-scheduler/district-times.service.js`
- [x] 1.2 En `district-times.service.js`: cargar `TablaDistritosLima` en Map al iniciar
- [x] 1.3 Exponer método `getTiempo(origen, destino)` con fallback 90 y mínimo 15 para mismo distrito
- [x] 1.4 Test unitario: `district-times.service.test.js` con casos: par existente, par inexistente, mismo distrito

### Servicio de demanda

- [x] 1.5 Crear `src/services/ia-scheduler/demand.service.js`
- [x] 1.6 Implementar `obtenerFuenteA(fechaObjetivo)` con la query SQL de MantenimientoFijo vencidos
- [x] 1.7 Implementar `obtenerFuenteB(fechaObjetivo)` con la query SQL de Programaciones pendientes
- [x] 1.8 Implementar `deduplicar(A, B)` que excluya de A los ascensores ya presentes en B
- [x] 1.9 Implementar `enriquecerConConfiguracion(items)` que agrega `duracion_min`, `tecnicos_requeridos`, `prioridad` de `ConfiguracionIA`
- [x] 1.10 Implementar `obtenerPool(fechaObjetivo)` que orquesta los 4 pasos anteriores
- [x] 1.11 Test de integración con BD real seedeada: verificar que la dedup y la frecuencia funcionan

### Servicio de técnicos

- [x] 1.12 Crear `src/services/ia-scheduler/worker.service.js`
- [x] 1.13 Implementar `obtenerTecnicos(ids, fecha)` con join + query de carga preexistente
- [x] 1.14 Test: técnico con 2 Programaciones confirmadas reporta 120 min de carga

### Motor

- [x] 1.15 Crear `src/services/ia-scheduler/motor.service.js`
- [x] 1.16 Definir constante `ELEGIBILIDAD` (matriz tipo_trabajo → especialidades permitidas)
- [x] 1.17 Implementar `validarInputs(workItems, tecnicos)` con throws apropiados
- [x] 1.18 Implementar `ordenarPorPrioridad(workItems)`
- [x] 1.19 Implementar `candidatosElegibles(workItem, tecnicos)`
- [x] 1.20 Implementar `elegirTecnico(workItem, candidatos, asignaciones)` con preferencia + greedy + clustering
- [x] 1.21 Implementar `asignarTecnicos(workItems, tecnicos)` que devuelve `{ asignaciones, sinElegible }`
- [x] 1.22 Implementar `nearestNeighbor(trabajos, districtTimes)`
- [x] 1.23 Implementar `secuenciarParadas(trabajosDelTecnico, districtTimes)` con manejo de fijos vs libres
- [x] 1.24 Implementar `calcularHorarios(secuencia, cargaPreexistente, config)` con ventana 08:30-18:30
- [x] 1.25 Implementar `procesarOverflow(tecnicosConParadas)`
- [x] 1.26 Implementar `generarPropuesta(workItems, tecnicos, fechaObjetivo)` que orquesta todos los pasos y devuelve estructura `PropuestaMotor`

### Tests del motor

- [x] 1.27 Test: respeta elegibilidad (no asigna reparación a Técnico de Mantenimiento)
- [x] 1.28 Test: ordena emergencias primero
- [x] 1.29 Test: respeta ventana 08:30-18:30 (detecta overflow correctamente)
- [x] 1.30 Test: clusterea por distrito cuando hay múltiples técnicos
- [x] 1.31 Test: respeta preferencia de técnico del MantenimientoFijo si tiene capacidad
- [x] 1.32 Test: maneja caso sin técnico elegible (sinElegible no vacío)
- [x] 1.33 Test: calcula tiempos de traslado acumulados correctamente

### Endpoints (sin LLM aún)

- [x] 1.34 Crear `src/controllers/ia-scheduler.controller.js` con métodos: `getDemand`, `getTecnicos`, `generar`, `getConfiguracion`, `updateConfiguracion`
- [x] 1.35 En `generar`: por ahora devolver `propuesta_motor` directa (sin LLM)
- [x] 1.36 Crear `src/routes/ia-scheduler.routes.js` con middleware `authMiddleware` + `requireRole('admin')`
- [x] 1.37 Montar la ruta en `src/app.js`: `app.use('/api/ia-scheduler', iaSchedulerRoutes)`
- [x] 1.38 Smoke test con curl/Postman: `GET /demand`, `GET /tecnicos`, `POST /generar` devuelven respuesta válida con `origen='motor'`

---

## Fase 2 — Integración LLM (cascada automática)

Ref: `docs/programador-ia/05-llm-integration.md`.

### Setup

- [ ] 2.1 Ejecutar `npm install @anthropic-ai/sdk` en `BackEnd-JmgAscensores/`
- [ ] 2.2 Agregar a `.env`: `ANTHROPIC_API_KEY=<key>` y `IA_SCHEDULER_MODEL=claude-haiku-4-5-20251001`
- [ ] 2.3 Agregar a `.env.example` (sin el valor real): las mismas variables
- [ ] 2.4 Agregar `IA_SCHEDULER_TIMEOUT_MS=10000` opcional

### Servicio LLM

- [ ] 2.5 Crear `src/services/ia-scheduler/llm.service.js`
- [ ] 2.6 Definir constante `SYSTEM_PROMPT` con el contenido completo de `docs/programador-ia/05-llm-integration.md` (sección System Prompt)
- [ ] 2.7 Implementar `ajustarPropuesta(propuestaMotor, instruccionAdmin)` con llamada a `client.messages.create` + `cache_control: ephemeral`
- [ ] 2.8 Implementar `parsearRespuesta(rawText, propuestaMotorFallback)` con try/catch JSON.parse
- [ ] 2.9 Implementar `validarPropuesta(propuesta, trabajadoresMap)` (guard de elegibilidad + solapamiento + ventana)
- [ ] 2.10 Implementar timeout de 10s con `AbortController` o equivalente
- [ ] 2.11 Test: ajustarPropuesta con propuesta válida devuelve propuesta con `origen='llm'` y justificaciones
- [ ] 2.12 Test: parsearRespuesta con JSON inválido devuelve propuesta motor con `origen='motor_fallback'`
- [ ] 2.13 Test: validarPropuesta detecta elegibilidad inválida y la revierte

### Servicio orquestador

- [ ] 2.14 Crear `src/services/ia-scheduler/scheduler.service.js`
- [ ] 2.15 Implementar `generarPropuesta(tecnicoIds, fecha, instruccionAdmin)` que orquesta: demand → workers → motor → llm → guard
- [ ] 2.16 Implementar `ajustarConInstruccion(propuestaActual, instruccion)` para el chat (solo LLM)
- [ ] 2.17 Manejar fallback: si llm falla → motor con `origen='motor_fallback'` + advertencia
- [ ] 2.18 Test de integración: cascada completa con LLM real

### Endpoints

- [ ] 2.19 Actualizar controller: `generar` ahora llama `scheduler.service.generarPropuesta`
- [ ] 2.20 Agregar endpoint POST `/ajustar` que llama `scheduler.service.ajustarConInstruccion`
- [ ] 2.21 Agregar logging por request: `admin_id`, `fecha`, `tecnico_ids`, `origen`, `tokens`, `duracion_ms`
- [ ] 2.22 Smoke test: `POST /generar` devuelve propuesta con justificaciones; `POST /ajustar` aplica una instrucción simple

---

## Fase 3 — Endpoint /confirmar (persistencia transaccional)

Ref: `docs/programador-ia/07-api-contracts.md` (sección `/confirmar`).

- [ ] 3.1 Implementar handler `confirmar` en `ia-scheduler.controller.js`
- [ ] 3.2 Abrir `sequelize.transaction()` con try/catch
- [ ] 3.3 Por cada técnico × trabajo: si `programacion_id === null`, INSERT Programacion (con `mantenimiento_fijo_id` poblado y `descripcion = justificacion`)
- [ ] 3.4 Si `programacion_id !== null`: UPDATE Programacion (trabajador_id, fecha_inicio, fecha_fin)
- [ ] 3.5 UPSERT RutaDiaria por técnico (hora_inicio = primera parada, hora_fin = última parada)
- [ ] 3.6 DELETE DetalleRuta anteriores de esa RutaDiaria
- [ ] 3.7 INSERT nuevos DetalleRuta con `programacion_id` y `orden_parada` correctos
- [ ] 3.8 `transaction.commit()` y respuesta `{ ok: true, programaciones_creadas, programaciones_actualizadas, rutas_generadas }`
- [ ] 3.9 Catch: `transaction.rollback()` + log + respuesta 500
- [ ] 3.10 Implementar optimistic locking: comparar `fecha_actualizacion` de Programaciones al UPDATE; si difiere, responder 409
- [ ] 3.11 Test de integración: confirmar propuesta y verificar BD con queries SELECT (Programaciones, RutasDiarias, DetalleRuta con `programacion_id` correcto)
- [ ] 3.12 Test: rollback si una Programacion tiene FK inválida (debe NO persistir nada)

---

## Fase 4 — Frontend base (componente + selector)

Ref: `docs/programador-ia/08-frontend-ux.md`.

### Estructura

- [ ] 4.1 Crear `src/app/features/admin/ai-assistant/components/ai-scheduler.component.ts` (componente raíz)
- [ ] 4.2 Eliminar contenido placeholder del archivo viejo `ai-assistant.component.ts` (o reemplazarlo)
- [ ] 4.3 Actualizar `admin.routes.ts` si el path cambia (si se renombra `ai-assistant` → `ai-scheduler`, sino dejar igual)

### Servicio Angular

- [ ] 4.4 Crear `src/app/core/services/ia-scheduler.service.ts` con `inject(HttpClient)`
- [ ] 4.5 Implementar métodos: `getDemand(fecha)`, `getTecnicos(fecha)`, `generar(body)`, `ajustar(body)`, `confirmar(body)`, `getConfiguracion()`, `updateConfiguracion(body)`

### Interfaces TypeScript

- [ ] 4.6 Crear `src/app/features/admin/models/ia-scheduler.interface.ts`
- [ ] 4.7 Definir: `Propuesta`, `TecnicoPropuesta`, `TrabajoEnRuta`, `WorkItem`, `DemandInfo`, `TecnicoConCarga`, `ConfiguracionIA`

### Header (selector de técnicos + fecha)

- [ ] 4.8 Crear `ai-scheduler-header.component.ts` con input fecha, chips de técnicos, botón generar
- [ ] 4.9 Implementar Signals: `selectedDate`, `selectedTecnicos`, `demandaInfo`, `tecnicosDisponibles`
- [ ] 4.10 En `ngOnInit` del componente raíz: llamar `getDemand` y `getTecnicos` en paralelo (combineLatest o `Promise.all`)
- [ ] 4.11 Botón "Generar" deshabilitado si `selectedTecnicos().length === 0`
- [ ] 4.12 Smoke test visual: el componente renderiza chips de técnicos y badge de demanda

---

## Fase 5 — Frontend timeline view + confirmación

Ref: `docs/programador-ia/08-frontend-ux.md` (secciones Timeline y Footer).

### Timeline

- [ ] 5.1 Crear `ai-scheduler-timeline.component.ts`
- [ ] 5.2 Implementar barra de timeline horizontal (8:30-18:30 = 100% de ancho)
- [ ] 5.3 Implementar bloques absolutos posicionados por porcentaje (`minutosToPercent`)
- [ ] 5.4 Aplicar colores por `tipo_trabajo`: emergencia=red, reparacion=orange, inspeccion=yellow, mantenimiento=blue
- [ ] 5.5 Implementar lista expandida debajo del timeline con: hora, cliente, distrito, duración, traslado, justificación
- [ ] 5.6 Sección de overflow con banner amber y sugerencias del LLM (campo `notas_overflow`)
- [ ] 5.7 Sección `sin_elegible` con banner rojo

### Banners de estado

- [ ] 5.8 Mostrar banner amarillo si `origen === 'motor_fallback'` ("Propuesta generada sin validación IA")
- [ ] 5.9 Mostrar banner si `advertencias.length > 0` con detalle de cada advertencia

### Footer + confirmación

- [ ] 5.10 Crear `ai-scheduler-footer.component.ts` con botones "Descartar" y "Confirmar"
- [ ] 5.11 Implementar `confirm dialog` antes de confirmar ("¿Confirmar X programaciones?")
- [ ] 5.12 En confirmar: llamar `iaSchedulerService.confirmar()` + toast de éxito
- [ ] 5.13 Redirect al calendario (`/admin/programming`) tras confirmación exitosa
- [ ] 5.14 Manejo de error 409 (conflicto): mostrar dialog con botón "Regenerar propuesta"

### Loading states

- [ ] 5.15 Spinner durante `state === 'loading'` con texto "Generando propuesta..."
- [ ] 5.16 Spinner durante `state === 'confirming'` con texto "Aplicando..."

---

## Fase 6 — Chat de ajustes

Ref: `docs/programador-ia/08-frontend-ux.md` (sección Chat).

- [ ] 6.1 Crear `ai-scheduler-chat.component.ts` con input + botón enviar
- [ ] 6.2 Implementar Signal `chatMessages` y `adjusting`
- [ ] 6.3 Enter en el input dispara envío
- [ ] 6.4 Al enviar: llamar `iaSchedulerService.ajustar({ propuesta_actual, instruccion })`
- [ ] 6.5 Actualizar `propuestaActual` Signal con la nueva respuesta (timeline se re-renderiza reactivamente)
- [ ] 6.6 Mensajes del chat se muestran como burbujas (user a la derecha, sistema a la izquierda)
- [ ] 6.7 Spinner "Ajustando..." durante la llamada
- [ ] 6.8 Manejo de error: si el ajuste falla, mostrar mensaje en el chat y mantener la propuesta anterior

---

## Fase 7 — Testing y refinamiento

- [ ] 7.1 Test E2E (Playwright): generar propuesta → revisar timeline → confirmar → verificar redirect al calendario
- [ ] 7.2 Test E2E: chat de ajustes modifica la propuesta visible
- [ ] 7.3 Test E2E: fallback motor (con `ANTHROPIC_API_KEY` inválida) muestra banner
- [ ] 7.4 Prueba con datos reales: comparar 5 días de programación histórica del admin vs propuesta del sistema
- [ ] 7.5 Ajustar el system prompt si hay patrones sub-óptimos (ej. el LLM no respeta consistentemente el técnico preferido)
- [ ] 7.6 Validar tabla de distritos: si los tiempos reales son consistentemente distintos, actualizar valores en BD
- [ ] 7.7 Validar duraciones por tipo: si `mantenimiento` realmente toma más/menos que 60 min, ajustar en `ConfiguracionIA`
- [ ] 7.8 Documentar en `docs/programador-ia/` cualquier ajuste de calibración descubierto en pruebas
- [ ] 7.9 Carga: probar con 20 trabajos × 5 técnicos. Verificar latencia <15s
- [ ] 7.10 Seguridad: verificar que técnico autenticado NO puede acceder a `/api/ia-scheduler/*`

---

## Definition of Done por fase

Cada fase está "done" cuando:
1. Todas las tareas de la fase tienen `[x]`.
2. Los tests unitarios y de integración asociados pasan.
3. Smoke test manual con datos reales fue ejecutado y exitoso.
4. La documentación en `docs/programador-ia/` refleja cualquier descubrimiento de la fase.
5. El código fue commiteado y pusheado al branch correspondiente.

---

## Definition of Done del cambio completo

El cambio se considera completo cuando:
1. Las 7 fases tienen DoD cumplido.
2. Los criterios de éxito del `proposal.md` están cubiertos por evidencia.
3. La fase de `sdd-verify` valida el cambio sin issues CRITICAL.
4. El admin probó el módulo con datos reales y aprobó el resultado.

Tras eso, se puede ejecutar `sdd-archive` para mover specs delta a specs principales y cerrar el change.
