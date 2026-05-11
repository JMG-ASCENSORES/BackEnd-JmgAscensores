# Programador IA — Documentación de Implementación

Documentación completa del módulo de programación de rutas con IA para JMG Ascensores.
Esta carpeta es la fuente de verdad para todo el proceso de implementación.

## Índice de archivos

| Archivo | Contenido |
|---|---|
| `00-overview.md` | Visión general, decisiones de diseño, arquitectura en 2 capas, stack |
| `01-business-rules.md` | Reglas de negocio: especialidades, tipos de trabajo, prioridades, ventana horaria |
| `02-data-model.md` | Modelos existentes relevantes + cambios necesarios (DetalleRuta, nuevas tablas) |
| `03-demand-sources.md` | Fuentes de demanda: SQL exactos, WorkItem interface, deduplicación |
| `04-deterministic-engine.md` | Algoritmo del motor: pseudocódigo, nearest-neighbor, overflow, tests |
| `05-llm-integration.md` | Claude API: system prompt completo, contrato JSON, fallback, costos |
| `06-district-time-matrix.md` | Tabla 20×20 de tiempos entre distritos de Lima con buffer de tráfico |
| `07-api-contracts.md` | Todos los endpoints REST: request/response exactos, lógica de confirmación |
| `08-frontend-ux.md` | Componente Angular: signals, sub-componentes, timeline, chat, flujo UX |
| `09-database-migrations.md` | SQL de migraciones 1–5, rollback, seed completo |
| `10-implementation-phases.md` | Plan de implementación: 7 fases con tareas, dependencias y estimación |

## Orden de lectura recomendado

1. `00-overview.md` — ¿qué es y por qué este diseño?
2. `01-business-rules.md` — reglas que el motor debe respetar
3. `09-database-migrations.md` — qué cambia en la BD (empezar aquí para implementar)
4. `03-demand-sources.md` + `04-deterministic-engine.md` — cómo funciona el backend
5. `05-llm-integration.md` — cómo se integra la IA
6. `07-api-contracts.md` — contratos de API para el frontend
7. `08-frontend-ux.md` — implementación del componente Angular
8. `10-implementation-phases.md` — plan de ejecución paso a paso

## Estado actual

Ver checklist en `10-implementation-phases.md`. Ninguna fase iniciada.
