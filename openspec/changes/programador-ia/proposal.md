# Proposal: Programador IA — Generación asistida de rutas diarias

## Why

Hoy el administrador de JMG Ascensores construye manualmente la programación del día siguiente: recorre el calendario, recuerda qué técnico va a qué zona, intenta balancear la carga entre 3-5 técnicos, y crea cada `Programacion` una por una. Con un volumen típico de 8-12 trabajos diarios distribuidos en 5+ distritos, el proceso:

- Toma 30-60 minutos cada noche o cada mañana.
- Es propenso a errores: solapamientos de horarios, técnicos sobrecargados, rutas con traslados largos innecesarios.
- No deja trazabilidad de **por qué** se asignó un trabajo a un técnico determinado.
- Depende fuertemente del conocimiento informal del admin sobre Lima y sobre la disponibilidad de cada técnico.

El cambio propone un módulo que **genera automáticamente una propuesta de programación**, optimizada según reglas de negocio explícitas y validada por IA, que el admin solo revisa y confirma. Reduce el tiempo de programación de ~45 minutos a ~5 minutos por día y elimina errores de solapamiento o asignación inválida por especialidad.

## What Changes

### Backend (BackEnd-JmgAscensores)

- Nuevo módulo de scheduling: `src/services/ia-scheduler/` (5 servicios: demand, worker, district-times, motor, llm, scheduler).
- Nuevo controlador: `src/controllers/ia-scheduler.controller.js`.
- Nuevas rutas REST bajo `/api/ia-scheduler` (7 endpoints), todas gateadas por rol admin.
- Integración con Claude API (`@anthropic-ai/sdk`) para la capa de validación/ajuste.
- 2 tablas nuevas: `ConfiguracionIA`, `TablaDistritosLima`.
- 1 alteración: `DetalleRuta` recibe columnas `programacion_id` y `orden_parada`.

### Frontend (FrontEnd-JmgAscensores)

- Reemplazo completo del placeholder `src/app/features/admin/ai-assistant/ai-assistant.component.ts` por el módulo funcional Programador IA.
- Nuevo servicio Angular: `src/app/core/services/ia-scheduler.service.ts`.
- Nuevos sub-componentes: header (selector), timeline (visualización), chat (ajustes), footer (confirmación).
- Nuevas interfaces TypeScript para los contratos de API.

### Base de datos

- Migración aditiva (no destructiva) sobre `DetalleRuta`.
- Creación de dos tablas de configuración + seeds iniciales (4 filas de `ConfiguracionIA`, ~420 filas de `TablaDistritosLima`).

## Out of Scope (v1)

- **Emergencias sin fecha**: el módulo solo programa trabajos que ya tienen fecha objetivo o vienen de un MantenimientoFijo vencido. Las emergencias "sueltas" se manejan por el flujo manual existente.
- **Auto-apply**: la confirmación es siempre manual. Auto-aplicar queda para una v2 una vez que haya confianza en la calidad de las propuestas.
- **Trabajos multi-técnico (2-4 técnicos en una misma Programacion)**: el motor asigna 1 técnico por trabajo. Casos especiales se gestionan manualmente después de la confirmación.
- **Google Distance Matrix u otra API de tráfico en tiempo real**: v1 usa una tabla estática de tiempos por distrito mantenida en BD.
- **Notificaciones automáticas a técnicos**: las notificaciones siguen el flujo normal de `Programaciones` ya existente.
- **Reagendamiento automático del overflow**: los trabajos que no caben en la jornada se marcan como overflow y el admin decide manualmente qué hacer con ellos.

## Impact

### Affected specs (capabilities)

- `ai-scheduling` — nuevo capability completo.

### Affected code paths

**Backend nuevo**:
- `src/services/ia-scheduler/` (directorio completo, ~6 archivos)
- `src/controllers/ia-scheduler.controller.js`
- `src/routes/ia-scheduler.routes.js`
- `src/models/ConfiguracionIA.js`
- `src/models/TablaDistritoLima.js`

**Backend modificado**:
- `src/app.js` — montar la nueva ruta
- `src/models/index.js` — agregar asociaciones DetalleRuta ↔ Programacion
- `package.json` — agregar `@anthropic-ai/sdk`
- `.env` — agregar `ANTHROPIC_API_KEY`, `IA_SCHEDULER_MODEL`

**Frontend nuevo**:
- `src/app/features/admin/ai-assistant/ai-scheduler.component.ts` (reemplaza placeholder)
- `src/app/features/admin/ai-assistant/components/` (4 sub-componentes)
- `src/app/core/services/ia-scheduler.service.ts`
- `src/app/features/admin/models/ia-scheduler.interface.ts`

**Migraciones SQL**:
- `scripts/migrations/001-detalle-ruta-programacion-id.sql`
- `scripts/migrations/002-configuracion-ia.sql`
- `scripts/migrations/003-tabla-distritos-lima.sql`
- `scripts/seeds/seed-configuracion-ia.sql`
- `scripts/seeds/seed-tabla-distritos.sql`

### Breaking changes

Ninguno. Todas las migraciones son aditivas. La alteración de `DetalleRuta` agrega columnas nullable que no rompen lectura ni escritura existente.

## Success Criteria

El cambio se considera exitoso cuando se cumplen **todos** los siguientes criterios:

1. **Funcional**: el admin puede generar una propuesta para mañana en un solo click, revisarla en timeline visual y confirmarla con persistencia transaccional.
2. **Calidad de propuesta**: en 5 días de prueba con datos reales, ≥80% de los trabajos generados por el motor son aceptables sin necesidad de ajuste manual.
3. **Latencia**: la generación completa (motor + LLM) responde en menos de 10 segundos en condiciones normales.
4. **Degradación**: si la API de Claude falla, el módulo responde con la propuesta del motor sin LLM, mostrando un banner informativo.
5. **Restricciones duras**: en ningún caso una propuesta confirmada viola la matriz de elegibilidad por especialidad ni la ventana 8:30-18:30 (salvo override explícito del admin).
6. **No regresión**: las `Programaciones` creadas por el módulo son indistinguibles en estructura de las creadas manualmente — el calendario existente las muestra normalmente.
7. **Auditabilidad**: cada propuesta confirmada registra en logs: admin, fecha, técnicos seleccionados, modelo LLM usado, tokens consumidos.

## Risks

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| El LLM devuelve JSON inválido o viola restricciones duras | Media | Medio | Validación post-LLM en backend; corrección automática al motor; banner de advertencia |
| Tabla de tiempos por distrito no refleja la realidad de Lima | Alta | Medio | Valores iniciales conservadores con buffer 30%; tabla editable desde admin sin redeploy |
| Costos de Claude API se disparan con uso intensivo | Baja | Bajo | Prompt caching activo (~90% reducción); modelo Haiku v1; monitoreo de tokens en logs |
| Admin no confía en la propuesta y la rehace manualmente | Media | Alto | Justificación por trabajo (LLM explica el "por qué"); chat de ajustes; preview siempre obligatorio |
| `DetalleRuta` actualmente sin link a Programacion rompe rutas existentes | Baja | Alto | Migración aditiva con columnas nullable; código nuevo siempre las llena, código viejo las ignora |
| El motor no contempla bien la carga preexistente de técnicos | Media | Medio | Query explícita de Programaciones ya confirmadas se inyecta al motor antes de asignar |

## Dependencies

- **Externa**: cuenta activa de Anthropic con API key válida y crédito.
- **Interna**: rol `admin` ya gateado por middleware existente (no requiere cambios).
- **Datos**: catálogo de `Clientes` debe tener `distrito` poblado para que la tabla de tiempos funcione. Los registros sin distrito serán manejados con fallback de 90 min.

## Decision Log (consenso registrado)

| Decisión | Elegida | Alternativa descartada |
|---|---|---|
| Arquitectura | Motor determinista + LLM ajustador en cascada automática | LLM puro |
| Geografía | Tabla de tiempos por distrito con buffer 30% | Haversine, Google Distance Matrix |
| Duraciones por tipo | Configurables en BD (`ConfiguracionIA`) | Hardcodeadas en código |
| Técnicos por trabajo | Inferido por tipo, ajustable | Campo `tecnicos_requeridos` en modelo |
| Preview/confirmación | Siempre manual, sin auto-apply en v1 | Auto-apply para casos de alta confianza |
| Componente frontend | Reemplaza `ai-assistant` existente | Ruta nueva paralela |
| Fuentes de demanda | MantenimientoFijo + Programaciones pendientes | También emergencias sin fecha (movido a v2) |
| Modelo LLM | Claude Haiku 4.5 con prompt caching | Sonnet 4.6 (upgrade si calidad insuficiente) |

## Approval

- Propuesto por: administrador JMG Ascensores
- Fecha de propuesta: 2026-05-11
- Estado: **APROBADA** para iniciar Fase 0 (migraciones).
