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
- [x] Apply iniciado — Fase 0 ✅, Fase 1 ✅, Fase 3 ✅
- [ ] Apply — Fase 2 (LLM)
- [ ] Apply — Fase 4-6 (Frontend)
- [ ] Apply — Fase 7 (Testing)
- [ ] Verify completado
- [ ] Archive

### Progreso por fase

| Fase | Tareas | Tests | Estado |
|------|--------|-------|--------|
| 0 — Migraciones | 15/15 | — | ✅ |
| 1 — Motor | 38/38 | 71 pasando | ✅ |
| 2 — LLM | 0/22 | — | 🔲 |
| 3 — Confirmar | 12/12 | 73 pasando | ✅ |
| 4 — Frontend base | 0/15 | — | 🔲 |
| 5 — Timeline | 0/16 | — | 🔲 |
| 6 — Chat | 0/8 | — | 🔲 |
| 7 — Testing | 0/10 | — | 🔲 |
