# Change: programador-ia

Artefactos formales de Spec-Driven Development para el módulo Programador IA.

## Archivos en este directorio

| Archivo | Contenido | Estado |
|---|---|---|
| `proposal.md` | Intención del cambio, alcance, criterios de éxito | ✓ |
| `spec.md` | Requerimientos como capabilities con escenarios GIVEN/WHEN/THEN | ✓ |
| `design.md` | Decisiones arquitectónicas con justificación y tradeoffs | ✓ |
| `tasks.md` | Checklist atómico de implementación, organizado por fase | ✓ |

## Relación con `docs/programador-ia/`

Estos artefactos SDD son la **versión estructurada y normativa** del cambio. El directorio `docs/programador-ia/` (en `BackEnd-JmgAscensores/docs/`) contiene la **referencia técnica detallada** (algoritmos completos con pseudocódigo, queries SQL exactas, tabla de tiempos por distrito, mockups de UI, etc.).

Regla de uso:
- **Para entender qué se está construyendo y por qué** → leer estos artefactos SDD.
- **Para implementar** → leer estos + los docs detallados en `docs/programador-ia/`.

## Estado del cambio

- [x] Propuesta aprobada
- [x] Spec definido
- [x] Design definido
- [x] Tasks descompuestas
- [x] Apply completado — Todas las fases ✅
- [ ] Verify completado
- [ ] Archive

### Progreso por fase

| Fase | Tareas | Tests | Estado |
|------|--------|-------|--------|
| 0 — Migraciones | 15/15 | — | ✅ |
| 1 — Motor | 38/38 | 17 (single-job) | ✅ |
| 2 — LLM | 19/22 | 11 (llm unit) | ✅ |
| 3 — Confirmar | 12/12 | 12 | ✅ |
| 4R — Frontend | 12/12 | — | ✅ |
| 5 — Sugerencia | 8/16 | — | ✅ |
| 6 — Chat | 8/8 | — | ✅ |
| 7 — Testing | 5/10 | 94 total | ✅ |
