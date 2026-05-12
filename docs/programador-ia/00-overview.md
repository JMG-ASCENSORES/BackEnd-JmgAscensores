# Programador IA — Visión General y Decisiones de Diseño

## Objetivo del módulo

Permitir que el administrador de JMG Ascensores planifique las rutas de trabajo del día siguiente para uno o varios técnicos, con el mínimo de input manual posible. El sistema genera automáticamente una propuesta optimizada que el admin revisa y confirma — nunca escribe directamente en base de datos sin aprobación explícita.

## Problema que resuelve

Hoy el administrador asigna trabajos del día siguiente de forma manual: revisa el calendario, recuerda qué técnico va a qué zona, intenta balancear la carga, y crea las `Programaciones` una por una. Con 3+ técnicos y 10+ trabajos diarios, este proceso es propenso a errores (solapamientos, zonas mal clusterizadas, técnicos sobrecargados) y consume tiempo que podría optimizarse.

## Cuándo SÍ aporta valor real

- ≥ 8 trabajos/día distribuidos entre ≥ 3 técnicos.
- Mix heterogéneo de tipos: mantenimiento + reparación + inspección + emergencia.
- Clientes en ≥ 3 distritos distintos en el mismo día.
- Restricciones que cambian día a día (emergencias de último momento, técnico disponible parcialmente, cliente con ventana horaria preferida).

## Cuándo NO aporta valor (degradar a drag-and-drop manual)

- < 5 trabajos y < 2 técnicos: un humano lo resuelve en 3 minutos.
- Programación 100% dominada por mantenimientos fijos predecibles: la asignación ya está implícita.

---

## Arquitectura en 2 capas (decisión central)

La propuesta se genera en **cascada automática**: sin paso intermedio visible para el admin.

```
Admin selecciona técnicos + fecha
         ↓
[CAPA 1: Motor determinista]  ← sin IA, sin red, en milisegundos
  - Lee demanda pendiente de la BD
  - Filtra por especialidad
  - Balancea carga entre técnicos
  - Clusteriza por zona geográfica
  - Secuencia paradas (tabla de tiempos por distrito)
  - Asigna hora_inicio / hora_fin por parada
  - Detecta overflow (trabajos que no caben en 8:30–18:30)
  → propuesta_motor (JSON interno)
         ↓
[CAPA 2: LLM ajustador-validador]  ← Claude API, ~5-8 segundos
  - Recibe propuesta_motor + contexto de negocio
  - Valida violaciones de reglas
  - Ajusta suboptimalidades evidentes
  - Agrega justificación por trabajo
  → propuesta_final (JSON)
         ↓
[Preview + confirmación del admin]
  - Timeline visual por técnico
  - Diff vs estado actual de la BD
  - Chat para ajustes en lenguaje natural (llama al LLM de nuevo)
  - Botón "Confirmar" → escribe en BD (transacción atómica)
```

### Por qué este diseño y no LLM puro

| Criterio | LLM puro | Motor + LLM |
|---|---|---|
| Si el LLM falla | Error total, admin ve pantalla vacía | Motor sirve como fallback, admin ve propuesta base |
| Costo por generación | $0.05–$0.30 (contexto completo) | $0.01–$0.05 (contexto ya reducido) |
| Latencia | 8–20s (toda la lógica en el LLM) | 5–8s (motor en <100ms, LLM sobre propuesta compacta) |
| Corrección geográfica | Alta aleatoriedad en Lima | Determinista (tabla de distritos) |
| Testabilidad | Solo via LLM calls | Motor testeable en aislamiento |
| Mantenibilidad | Reglas en el prompt (frágil) | Reglas en código (explícitas) |

### Modo fallback

Si el LLM falla (timeout, rate limit, error de API):
- El backend devuelve la `propuesta_motor` tal cual.
- El frontend muestra un banner: _"Propuesta generada por motor base — validación IA no disponible."_
- El admin puede confirmar igualmente o usar el chat cuando el LLM se recupere.

---

## Stack involucrado

### Backend (Node.js + Express + Sequelize)
- Nuevos módulos en `/src/controllers/ia-scheduler.controller.js`
- Nuevos servicios en `/src/services/ia-scheduler/`
  - `motor.service.js` — capa determinista
  - `llm.service.js` — integración Claude API
  - `scheduler.service.js` — orquestador de las 2 capas
  - `district-times.service.js` — tabla de tiempos entre distritos
- Nueva ruta `/src/routes/ia-scheduler.routes.js`
- Nuevas tablas: ver `09-database-migrations.md`

### Frontend (Angular 21 + Signals + Tailwind)
- Componente principal: `src/app/features/admin/ai-assistant/`
  - Renombrar a `ai-scheduler` o mantener el folder y reemplazar el componente
- Sub-componentes: selector de técnicos, timeline view, panel de chat, card de propuesta
- Servicio Angular: `src/app/core/services/ia-scheduler.service.ts`

### LLM
- Proveedor: Anthropic (Claude API)
- Modelo: **claude-haiku-4-5** para generación inicial (costo bajo, buena calidad para validación estructurada)
- Upgrade a **claude-sonnet-4-6** si la calidad de Haiku no alcanza en pruebas reales
- Prompt caching activado en el system prompt (reduce costo ~90% en llamadas repetidas)

---

## Restricciones de acceso

- El módulo es **exclusivo del rol administrador** (`Administrador` en la BD, guard ya existente).
- Los técnicos no tienen acceso a este módulo.
- Las `Programaciones` creadas vía este módulo son idénticas en estructura a las creadas manualmente — no hay diferencia en el modelo de datos.

---

## Fuentes de demanda para el día siguiente

Ver detalle completo en `03-demand-sources.md`. Resumen:

1. **MantenimientosFijos vencidos** (día del mes coincide con mañana, según frecuencia).
2. **Programaciones pendientes sin técnico** creadas para mañana.
3. ~~Emergencias sin fecha~~ (excluido de v1 por complejidad — agregar en v2).

---

## Estado de la implementación

- [x] Fase 0: Migraciones de base de datos — 15/15 tasks, PostgreSQL en Render
- [x] Fase 1: Motor determinista (backend) — 38/38 tasks, 71 tests, 4 servicios
- [ ] Fase 2: Integración LLM (cascada)
- [ ] Fase 3: Endpoints API REST
- [ ] Fase 4: Frontend — componente base + selector
- [ ] Fase 5: Frontend — timeline view
- [ ] Fase 6: Frontend — chat de ajustes
- [ ] Fase 7: Testing y ajuste de prompts

### Implementación completada

| Componente | Archivos | Descripción |
|---|---|---|
| Modelos | `ConfiguracionIA.js`, `TablaDistritoLima.js` | 2 tablas nuevas + seeds |
| Schema | `DetalleRuta.js` (+2 cols), `models/index.js` | FK a Programaciones |
| Servicios | `demand`, `worker`, `district-times`, `motor` | Pool de demanda + algoritmo |
| API | `ia-scheduler.controller.js`, `routes` | 5 endpoints protegidos |
| Tests | 5 suites, 71 tests | Unitarios + integración + smoke |
| Migraciones | `scripts/migrations/`, `scripts/seeds/` | PostgreSQL adaptado |

Ver plan completo en `10-implementation-phases.md`.

---

## Decisiones tomadas (no reabrir sin consenso)

| Decisión | Elegida | Alternativa descartada |
|---|---|---|
| Arquitectura | Motor + LLM en cascada | LLM puro |
| Geografía | Tabla de tiempos por distrito + buffer tráfico | Google Distance Matrix, Haversine |
| Duración trabajos | Configurable por tipo (BD) | Campo por programación individual |
| Técnicos por tipo | Inferido por tipo_trabajo | Campo `tecnicos_requeridos` en modelo |
| Preview | Siempre, confirmación manual | Auto-apply |
| Componente frontend | Reemplaza placeholder `ai-assistant` | Ruta nueva |
| Emergencias | Excluidas de v1 | Incluidas (aumenta complejidad) |
