# Programador IA — Visión General y Decisiones de Diseño

## Objetivo del módulo

Permitir que el administrador de JMG Ascensores programe un trabajo específico para un día determinado con el mínimo de input manual posible. El sistema evalúa todos los técnicos elegibles en base a sus horarios existentes y genera una sugerencia optimizada del mejor técnico y horario disponible. El admin revisa y confirma — nunca escribe directamente en base de datos sin aprobación explícita.

## Problema que resuelve

Hoy el administrador asigna técnicos manualmente: revisa quién ya tiene trabajos ese día, busca huecos en sus horarios, recuerda zonas y recorridos, y crea la `Programacion` a mano. Con 3+ técnicos y horarios variables, este proceso es propenso a errores (solapamientos, traslados ineficientes, técnico sobrecargado) y consume tiempo que el sistema puede optimizar.

## Cuándo SÍ aporta valor real

- El admin necesita programar un trabajo urgente y no recuerda quién tiene disponibilidad.
- Hay varios técnicos con horarios parcialmente ocupados y encontrar el hueco óptimo es complejo.
- El trabajo requiere una especialidad específica que limita los candidatos.
- El cliente tiene una hora preferida y el admin necesita saber si algún técnico puede llegar sin conflictos de traslado.

## Cuándo NO aporta valor (dejar al admin)

- El trabajo tiene un técnico obvio asignado por contrato o preferencia fuerte.
- Solo hay 1 técnico disponible para ese tipo de trabajo.

---

## Arquitectura en 2 capas (decisión central)

El flujo es: el admin define un trabajo nuevo → el sistema sugiere el mejor técnico y horario.

```
Admin llena formulario (cliente + equipo + tipo_trabajo + fecha + hora_preferida?)
         ↓
[CAPA 1: Motor determinista]  ← sin IA, sin red, en milisegundos
  - Recibe definición del trabajo + lista de técnicos elegibles
  - Lee la carga preexistente de cada técnico para esa fecha
  - Para cada técnico elegible: calcula el mejor slot disponible
  - Aplica restricciones: ventana 08:30–18:30, traslados entre distritos,
    no solapamiento con trabajos ya confirmados
  - Ordena técnicos por idoneidad (menor carga + mejor cluster geográfico)
  → evaluacion_motor (JSON interno con técnicos rankeados + slots calculados)
         ↓
[CAPA 2: LLM ajustador-validador]  ← Claude API, ~3-5 segundos
  - Recibe la evaluación del motor + contexto del trabajo
  - Valida que no haya violaciones de reglas
  - Agrega justificación para la sugerencia principal y las alternativas
  - Puede detectar preferencias no obvias (equipo complejo, distrito conflictivo)
  → sugerencia_final (JSON con sugerencia + alternativas + justificaciones)
         ↓
[Preview + confirmación del admin]
  - Sugerencia principal destacada con justificación del LLM
  - Alternativas ordenadas (otros técnicos con su slot calculado)
  - Botón "Confirmar" → crea la Programacion en BD (transacción atómica)
```

### Por qué este diseño y no LLM puro

| Criterio | LLM puro | Motor + LLM |
|---|---|---|
| Si el LLM falla | Error total, admin ve pantalla vacía | Motor sirve como fallback, admin ve sugerencia base |
| Costo por generación | $0.05–$0.30 (contexto completo) | $0.005–$0.02 (contexto ya reducido) |
| Latencia | 8–20s (toda la lógica en el LLM) | 3–5s (motor en <100ms, LLM sobre evaluación compacta) |
| Corrección geográfica | Alta aleatoriedad en Lima | Determinista (tabla de distritos) |
| Testabilidad | Solo via LLM calls | Motor testeable en aislamiento |
| Mantenibilidad | Reglas en el prompt (frágil) | Reglas en código (explícitas) |

### Modo fallback

Si el LLM falla (timeout, rate limit, error de API):
- El backend devuelve la `evaluacion_motor` tal cual.
- El frontend muestra un banner: _"Sugerencia generada por motor base — validación IA no disponible."_
- El admin puede confirmar igualmente o esperar a que el LLM se recupere.

---

## Stack involucrado

### Backend (Node.js + Express + Sequelize)
- Nuevos módulos en `/src/controllers/ia-scheduler.controller.js`
- Nuevos servicios en `/src/services/ia-scheduler/`
  - `motor.service.js` — capa determinista (evaluación de técnicos para 1 trabajo)
  - `llm.service.js` — integración Claude API
  - `scheduler.service.js` — orquestador de las 2 capas
  - `district-times.service.js` — tabla de tiempos entre distritos
- Nueva ruta `/src/routes/ia-scheduler.routes.js`
- Nuevas tablas: ver `09-database-migrations.md`

### Frontend (Angular 21 + Signals + Tailwind)
- Componente principal: `src/app/features/admin/ai-assistant/ai-assistant.component.ts`
- Sub-componentes: formulario de trabajo, panel de sugerencia, lista de alternativas
- Servicio Angular: `src/app/core/services/ia-scheduler.service.ts`

### LLM
- Proveedor: Anthropic (Claude API)
- Modelo: **claude-haiku-4-5** para generación inicial (costo bajo, buena calidad para validación estructurada)
- Upgrade a **claude-sonnet-4-6** si la calidad de Haiku no alcanza en pruebas reales
- Prompt caching activado en el system prompt (reduce costo ~90% en llamadas repetidas)

---

## Restricciones de acceso

- El módulo es **exclusivo del rol administrador** (`ADMIN` en la BD, guard ya existente).
- Los técnicos no tienen acceso a este módulo.
- Las `Programaciones` creadas vía este módulo son idénticas en estructura a las creadas manualmente — no hay diferencia en el modelo de datos.

---

## Diferencia fundamental con el diseño batch original

El módulo **no lee un pool de trabajos pendientes** de la base de datos como entrada al motor. En cambio:

1. **El admin define el trabajo en el momento**: cliente, equipo, tipo, fecha, y opcionalmente una hora preferida.
2. **El motor evalúa todos los técnicos** elegibles para ese trabajo y calcula para cada uno el mejor slot disponible en su agenda de ese día.
3. **Se crea UNA Programacion** al confirmar — con el técnico ya asignado.

Los `MantenimientosFijos` vencidos siguen siendo relevantes como **contexto de carga**: si un MantenimientoFijo ya fue confirmado para un técnico ese día, eso aparece en su `carga_preexistente` y el motor lo toma en cuenta al calcular slots. Pero no son la entrada del motor — es el trabajo ad-hoc que definió el admin.

---

## Fuentes de contexto de carga del técnico

Para calcular qué slots tiene disponibles cada técnico, el motor lee:

1. **Programaciones confirmadas** (`trabajador_id IS NOT NULL`, estado ≠ 'cancelado') para esa fecha — incluye MantenimientosFijos ya programados.
2. **RutaDiarias** existentes del técnico para esa fecha (para obtener `ultima_hora_fin` eficientemente).

No hay "pool de demanda" — la demanda es el trabajo que el admin acaba de definir en el formulario.

---

## Estado de la implementación

- [x] Fase 0: Migraciones de base de datos — PostgreSQL en Render, 400 distritos, ConfiguracionIA
- [x] Fase 1: Motor determinista — single-job mode, calcularSlot + evaluarTecnicos
- [x] Fase 2: Integración LLM — Claude Haiku 4.5, prompt caching, guard de elegibilidad
- [x] Fase 3: Endpoint /confirmar — transacción atómica, RutaDiaria, DetalleRuta
- [x] Fase 4R: Frontend formulario — cliente, ascensor, tipo, hora preferida
- [x] Fase 5: Panel de sugerencia — sugerencia principal + alternativas + confirmar
- [x] Fase 6: Chat de ajustes — lenguaje natural vía Claude
- [x] Fase 7: Testing — 94 tests en 9 suites

### ✅ IMPLEMENTACIÓN COMPLETA

| Componente | Archivos | Descripción |
|---|---|---|
| Modelos | `ConfiguracionIA.js`, `TablaDistritoLima.js` | 2 tablas nuevas + seeds |
| Schema | `DetalleRuta.js` (+2 cols), `models/index.js` | FK a Programaciones |
| Motor | `motor.service.js` | calcularSlot, evaluarTecnicos, nearest-neighbor |
| LLM | `llm.service.js`, `scheduler.service.js` | Claude Haiku + fallback + guard |
| API | `controller`, `routes` | 6 endpoints: demand, tecnicos, generar, ajustar, confirmar, config |
| Frontend | 5 componentes standalone | Form, suggestion, demand-context, chat, root |
| Tests | 9 suites, 94 tests | Unitarios + integración + E2E + smoke |
| Migraciones | `scripts/migrations/`, `scripts/seeds/` | PostgreSQL adaptado |

Ver plan completo en `10-implementation-phases.md`.

---

## Decisiones tomadas (no reabrir sin consenso)

| Decisión | Elegida | Alternativa descartada |
|---|---|---|
| Arquitectura | Motor + LLM en cascada | LLM puro |
| Modo de operación | Single-job (admin define 1 trabajo ad-hoc) | Batch optimizer (pool de demanda del día) |
| Geografía | Tabla de tiempos por distrito + buffer tráfico | Google Distance Matrix, Haversine |
| Duración trabajos | Configurable por tipo (BD) | Campo por programación individual |
| Elegibilidad técnicos | Inferido por tipo_trabajo (matriz dura) | Sin restricción por especialidad |
| Preview | Siempre, confirmación manual | Auto-apply |
| Componente frontend | Formulario ad-hoc (reemplaza selector de pool) | Selector de pool batch |
| Resultado de confirmación | 1 Programacion con técnico asignado | Batch de Programaciones |
| Emergencias | Incluidas en v1 (tipo_trabajo = emergencia) | Excluidas |
| Chat de ajustes | Fase 6 (opcional, post-sugerencia) | No chat |
