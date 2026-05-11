# Design: programador-ia

Documento técnico de decisiones arquitectónicas con justificación y tradeoffs evaluados. Las decisiones de este documento son las que dieron forma al cambio — están cerradas. Cambios en estas decisiones requieren actualizar este documento explícitamente.

---

## Context

### Estado actual

El módulo `Programaciones` del sistema permite al admin crear manualmente trabajos asignados a técnicos. El modelo `MantenimientoFijo` declara planes recurrentes pero no se materializan automáticamente — el admin debe crear cada `Programacion` revisando manualmente qué planes vencen. El modelo `RutaDiaria` existe pero `DetalleRuta` no tiene vínculo con `Programacion`, dejando las rutas como entidades semánticamente huecas.

El admin reporta:
- Tiempo dedicado a programar el día siguiente: 30-60 min diarios.
- Errores frecuentes de solapamiento o sobreasignación.
- No hay registro de "por qué" se asignó un trabajo a un técnico.

### Restricciones del negocio

- **Geografía Lima**: tráfico altamente variable, transporte público predominante para técnicos.
- **Jornada laboral**: 08:30-18:30 estricto en ~95% de los casos.
- **Especialidades**: técnicos no son intercambiables — un Técnico de Mantenimiento no puede hacer reparaciones complejas.
- **Volumen típico**: 8-12 trabajos diarios distribuidos en 3-5 técnicos.
- **Decisión de equipo**: el admin valida cada programación; nunca se publica sin su aprobación explícita.

### Restricciones técnicas

- Stack backend: Node.js + Express + Sequelize + MySQL.
- Stack frontend: Angular 21 standalone + Signals + Tailwind.
- Los cambios deben ser **aditivos** sobre el esquema de BD (no se permite romper código existente).
- El módulo debe degradar elegantemente ante fallos externos (LLM, red).

---

## Goals

1. Generar propuestas de programación diaria en ≤10 segundos end-to-end.
2. Reducir tiempo de programación manual del admin de ~45 min a ~5 min/día.
3. Garantizar 0 violaciones de restricciones duras (elegibilidad, ventana horaria, solapamiento) en propuestas confirmadas.
4. Proveer trazabilidad (justificación por trabajo, logs de auditoría).
5. Degradar a "motor sin LLM" si la integración con Claude falla.

## Non-Goals

1. NO reemplazar la programación manual — el admin sigue siendo el decisor final.
2. NO optimización combinatoria pura (no es necesario un ILP solver; el greedy es suficiente para volúmenes típicos).
3. NO predicción de tráfico en tiempo real.
4. NO scheduling para más de 1 día a la vez (v1 = mañana únicamente).
5. NO auto-aplicación sin confirmación del admin.

---

## Decisions

### Decision 1: Arquitectura en 2 capas (Motor + LLM en cascada automática)

**Elegido**: motor determinista produce propuesta base, que pasa automáticamente al LLM para validación/ajuste. El usuario solo ve la propuesta final.

**Alternativas evaluadas**:

- **A. LLM puro**: pasar toda la demanda + técnicos al LLM y dejar que el LLM decida todo.
  - Pro: implementación más corta (un solo servicio).
  - Contra: LLM no maneja bien combinatoria geográfica; alta variabilidad entre llamadas; sin fallback si la API falla; costo significativamente más alto por la cantidad de contexto necesaria.
- **B. Motor solo (sin LLM)**: greedy puro determinista.
  - Pro: ultra confiable, instantáneo, $0 costo.
  - Contra: no maneja instrucciones en lenguaje natural; no agrega justificación legible; rígido.
- **C. Motor + LLM con paso intermedio de revisión**: admin ve propuesta del motor antes de pedir refinamiento del LLM.
  - Pro: más control para el admin.
  - Contra: agrega un paso explícito en la UX que el usuario marcó como no deseado ("la idea es reducir los pasos").

**Tradeoffs aceptados**:
- Mayor complejidad de orquestación (dos capas a coordinar).
- Necesidad de validación post-LLM para garantizar restricciones duras.
- Latencia agregada del LLM (5-8s), aceptable dentro del presupuesto de 10s.

---

### Decision 2: Geografía como tabla estática de tiempos por distrito (no Haversine, no Google Maps)

**Elegido**: tabla `TablaDistritosLima` de pares `(origen, destino, tiempo_min)` con buffer de tráfico del 30%, almacenada en BD y editable desde admin.

**Alternativas evaluadas**:

- **A. Haversine sobre `Cliente.latitud/longitud`**: cálculo de distancia en línea recta.
  - Pro: gratis, no requiere data adicional.
  - Contra: en Lima la línea recta es un mal predictor del tiempo real (avenidas, semáforos, tráfico, transporte público).
- **B. Google Distance Matrix API con `mode=transit`**: tiempos reales con tráfico.
  - Pro: precisión alta.
  - Contra: costo (~$5/1000 consultas), requiere API key, requiere red, requiere caché para evitar costos altos, agrega punto de falla.
- **C. Velocidad promedio uniforme** (e.g., dist/15 km/h): híbrido entre A y B.
  - Pro: simple.
  - Contra: ignora asimetrías de Lima.

**Tradeoffs aceptados**:
- La tabla requiere mantenimiento manual cuando cambian las condiciones del transporte (nuevas líneas, nuevas rutas).
- Asimetría norte-sur de Lima se simplifica (tabla simétrica).
- Para distritos no en tabla, fallback de 90 minutos (conservador).

**Migración futura**: la interfaz `district-times.service.js` expone solo `getTiempo(origen, destino)`. Si en v2 se decide migrar a Google Distance Matrix, solo se cambia la implementación de ese servicio sin tocar el motor.

---

### Decision 3: Configuración del módulo en BD (no hardcoded, no env vars)

**Elegido**: dos tablas (`ConfiguracionIA`, `TablaDistritosLima`) almacenan duraciones, técnicos requeridos, prioridades, ventana horaria y matriz de tiempos. Editables vía API.

**Alternativas evaluadas**:

- **A. Constantes en código**: valores en un archivo `constants.js`.
  - Pro: simple, tipado, en control de versiones.
  - Contra: cualquier ajuste requiere redeploy.
- **B. Variables de entorno**: valores en `.env`.
  - Pro: ajustable sin tocar código.
  - Contra: limitado para datos estructurados (la matriz de distritos es 400+ entradas).

**Tradeoffs aceptados**:
- Necesidad de pantalla de admin para editar la configuración (puede ser una versión simple inicial).
- Riesgo de configuración inválida si no hay validación al guardar.
- Inicialización vía seeds que deben mantenerse actualizados.

---

### Decision 4: Técnicos requeridos por tipo de trabajo inferido, sin campo nuevo en `Programacion`

**Elegido**: el campo `tecnicos_requeridos` vive en `ConfiguracionIA` por tipo de trabajo. El admin puede sobreescribirlo manualmente en la propuesta antes de confirmar (asignando técnicos a `tecnico2_id..tecnico4_id`).

**Alternativas evaluadas**:

- **A. Campo `tecnicos_requeridos` en `MantenimientoFijo` y `Programacion`**: explícito por trabajo.
  - Pro: máxima precisión.
  - Contra: nuevo campo a poblar en todos los registros existentes; el admin debe pensar este parámetro al crear cada plan.

**Tradeoffs aceptados**:
- v1 asigna siempre 1 técnico por trabajo. Casos especiales se manejan post-confirmación.
- Si en la práctica esto es insuficiente, v2 puede agregar el campo sin romper v1.

---

### Decision 5: Fuentes de demanda restringidas a `MantenimientoFijo` vencidos + `Programaciones` pendientes sin técnico

**Elegido**: la demanda se construye desde dos fuentes SQL específicas. Emergencias sin fecha previa quedan fuera de v1.

**Alternativas evaluadas**:

- **A. Incluir emergencias sin fecha** (Programaciones con `fecha_inicio=NULL` y tipo `emergencia`/`reparacion`).
  - Pro: el módulo se vuelve más útil para gestionar urgencias.
  - Contra: complejidad UX (panel adicional "cola de pendientes a programar"); el admin debe decidir cuáles "bajan" al día programado; comportamiento del motor más complejo.

**Tradeoffs aceptados**:
- Las emergencias siguen el flujo manual existente en v1.
- Si el módulo demuestra valor, v2 puede integrar emergencias con un selector adicional.

---

### Decision 6: Modelo Claude Haiku 4.5 con prompt caching como modelo inicial

**Elegido**: `claude-haiku-4-5-20251001` con `cache_control: ephemeral` en el system prompt. Variable de entorno `IA_SCHEDULER_MODEL` permite cambiar a Sonnet sin tocar código.

**Alternativas evaluadas**:

- **A. Claude Sonnet 4.6 directo**: mejor razonamiento.
  - Pro: justificaciones más ricas, mejores ajustes en casos complejos.
  - Contra: 5x más caro, ~3x más lento (8s vs 3s).
- **B. GPT-4 / otro modelo**: alternativa de proveedor.
  - Pro: diversifica proveedores.
  - Contra: requeriría SDK distinto; el equipo ya está pensando en Anthropic; perdería el caching nativo.

**Tradeoffs aceptados**:
- Si la calidad de Haiku no alcanza en pruebas reales, el upgrade es solo cambiar la env var.
- Costo estimado para JMG: ~$0.01-$0.15/día con Haiku, manejable.

---

### Decision 7: Validación post-LLM con guard de restricciones duras

**Elegido**: el backend valida la respuesta del LLM antes de devolverla al frontend. Cualquier violación de elegibilidad o solapamiento se revierte al valor del motor para ese trabajo específico.

**Alternativas evaluadas**:

- **A. Confiar en el LLM** y validar solo en el frontend.
  - Pro: implementación más simple.
  - Contra: un LLM con bug del prompt podría persistir programaciones inválidas; el frontend no es la última línea de defensa.

**Tradeoffs aceptados**:
- Más código en backend.
- El admin a veces verá un banner "la IA hizo X cambios pero fueron corregidos por el guard". Es un buen indicador de calidad del prompt.

---

### Decision 8: Persistencia transaccional con rollback total ante error

**Elegido**: la confirmación de una propuesta es una transacción Sequelize. Si falla cualquier INSERT/UPDATE, se hace rollback completo. Sin estado parcial.

**Alternativas evaluadas**:

- **A. Confirmación por técnico (no atómica)**: cada técnico se persiste independientemente.
  - Pro: si un técnico falla, los otros se guardan.
  - Contra: estado inconsistente en BD; admin se queda confundido sobre qué se guardó.

**Tradeoffs aceptados**:
- Si la propuesta es grande y falla en mitad, el admin debe regenerar todo.
- Es la decisión correcta para mantener la BD coherente.

---

## Architecture

### Vista de componentes

```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (Angular)                  │
│  ai-scheduler.component  ─→  IaSchedulerService          │
└───────────────────────────────┬──────────────────────────┘
                                │ HTTPS (REST + JWT admin)
┌───────────────────────────────▼──────────────────────────┐
│                     Backend (Express)                     │
│  ia-scheduler.controller                                  │
│         │                                                 │
│         ├─→ scheduler.service (orquestador)              │
│         │     │                                           │
│         │     ├─→ demand.service     ─→ Sequelize ─→ MySQL│
│         │     ├─→ worker.service     ─→ Sequelize ─→ MySQL│
│         │     ├─→ district-times.service (caché en RAM)  │
│         │     ├─→ motor.service (puro JS)                │
│         │     └─→ llm.service        ─→ Anthropic API    │
│         │                                                 │
│         └─→ confirm logic (Sequelize transaction)         │
└───────────────────────────────────────────────────────────┘
```

### Flujo de generación

```
1. Admin pulsa "Generar"
2. Frontend: POST /api/ia-scheduler/generar { fecha, tecnico_ids }
3. Controller → SchedulerService.generarPropuesta()
4.   DemandService.obtenerPool(fecha)
        ├ queryFuenteA: MantenimientoFijo vencidos
        ├ queryFuenteB: Programaciones pendientes sin técnico
        ├ deduplicar
        └ enriquecerConConfiguracion (durations, priorities)
5.   WorkerService.obtenerTecnicos(ids, fecha)
        └ queryCargaPreexistente
6.   MotorService.generarPropuesta(pool, técnicos)
        ├ validarInputs
        ├ ordenarPorPrioridad
        ├ asignarTecnicos (greedy + elegibilidad)
        ├ secuenciarParadas (nearest-neighbor + districtTimes)
        ├ calcularHorarios (08:30 start + duración + traslado)
        └ procesarOverflow
        → propuesta_motor
7.   LLMService.ajustarPropuesta(propuesta_motor)
        ├ build user message
        ├ call Anthropic API (Haiku + prompt cache)
        ├ parse JSON
        └ on error: return propuesta_motor with origen='motor_fallback'
8.   Validar restricciones duras (guard post-LLM)
        └ revertir violaciones al valor del motor
9.   Devolver propuesta al frontend
```

### Flujo de confirmación

```
1. Admin pulsa "Confirmar"
2. Frontend: POST /api/ia-scheduler/confirmar { fecha, propuesta }
3. Backend abre transaction Sequelize
4. Por cada técnico en propuesta:
      Por cada trabajo:
        if (programacion_id === null):
            INSERT Programacion (de MantenimientoFijo)
        else:
            UPDATE Programacion (asignar trabajador + horarios)
      UPSERT RutaDiaria (1 por técnico, ese día)
      DELETE DetalleRuta anteriores de esa RutaDiaria
      INSERT nuevos DetalleRuta con programacion_id + orden_parada
5. transaction.commit()
6. Si cualquier error: transaction.rollback() + respuesta 500/409
```

---

## Data Model Changes

### Tabla nueva: `ConfiguracionIA`

```
config_id              INT PK AUTO_INCREMENT
tipo_trabajo           VARCHAR(50) UNIQUE — 'mantenimiento'|'reparacion'|'inspeccion'|'emergencia'
duracion_min           INT
tecnicos_requeridos    INT DEFAULT 1
prioridad              INT — 1=emergencia (más alto), 4=mantenimiento
hora_inicio_default    TIME DEFAULT '08:30:00'
hora_fin_limite        TIME DEFAULT '18:30:00'
activo                 BOOLEAN DEFAULT true
fecha_actualizacion    DATETIME ON UPDATE CURRENT_TIMESTAMP
```

### Tabla nueva: `TablaDistritosLima`

```
id                     INT PK AUTO_INCREMENT
distrito_origen        VARCHAR(100)
distrito_destino       VARCHAR(100)
tiempo_min             INT — minutos con buffer 30%
activo                 BOOLEAN DEFAULT true
UNIQUE KEY (distrito_origen, distrito_destino)
```

### Alteración: `DetalleRuta`

```
+ programacion_id  INT NULL FK → Programaciones(programacion_id) ON DELETE SET NULL
+ orden_parada     INT NULL — 1-based, secuencia del técnico en el día
+ INDEX idx_detalle_ruta_programacion (programacion_id)
+ INDEX idx_detalle_ruta_orden (ruta_id, orden_parada)
```

---

## API Surface

| Método | Path | Descripción |
|---|---|---|
| GET | `/api/ia-scheduler/demand?fecha=YYYY-MM-DD` | Pool de trabajos pendientes |
| GET | `/api/ia-scheduler/tecnicos?fecha=YYYY-MM-DD` | Técnicos activos + carga |
| POST | `/api/ia-scheduler/generar` | Genera propuesta (motor + LLM) |
| POST | `/api/ia-scheduler/ajustar` | Ajusta propuesta con instrucción NL |
| POST | `/api/ia-scheduler/confirmar` | Persiste propuesta confirmada |
| GET | `/api/ia-scheduler/configuracion` | Lee config actual |
| PUT | `/api/ia-scheduler/configuracion` | Actualiza config (admin) |

Detalle completo en `docs/programador-ia/07-api-contracts.md`.

---

## Failure Modes & Recovery

| Failure | Comportamiento esperado |
|---|---|
| Anthropic API timeout >10s | Fallback automático al motor; banner UI; admin puede continuar |
| Anthropic API rate limit | 1 reintento con 2s delay; si falla, fallback motor |
| LLM responde JSON inválido | Log de error; fallback motor; banner UI |
| LLM viola restricción dura | Guard revierte al motor; advertencia en respuesta |
| MySQL pierde conexión durante transacción | Rollback automático; respuesta 500 con mensaje claro |
| Optimistic lock conflict | Respuesta 409; admin debe regenerar |
| `ANTHROPIC_API_KEY` no configurada al arrancar | Log warning; el módulo funciona en modo motor-only |
| Tabla `TablaDistritosLima` vacía | Motor usa fallback 90 min; warning en logs |
| Cliente sin distrito | Motor usa fallback 90 min; warning por trabajo |

---

## Performance Considerations

- **Carga inicial de `TablaDistritosLima`**: ~420 filas leídas una vez al arranque, cacheadas en memoria (Map). Latencia despreciable.
- **Latencia esperada por endpoint**:
  - `/demand`: <200ms (2 queries simples con joins)
  - `/tecnicos`: <100ms (1 query con left join)
  - `/generar`: 5-10s (motor <100ms, LLM 3-8s con cache warm)
  - `/ajustar`: 3-8s (similar a `/generar` pero sin motor)
  - `/confirmar`: <500ms (transacción con N INSERTs/UPDATEs, N≤20)

---

## Security

- Todos los endpoints requieren JWT válido + rol admin.
- `ANTHROPIC_API_KEY` solo en `.env` del servidor, nunca expuesta al frontend.
- Las llamadas al LLM no incluyen datos sensibles (DNI, contraseñas, etc.).
- Logs no incluyen el contenido del prompt ni la respuesta completa del LLM (solo metadata).

---

## Observability

- Cada generación loguea: `admin_id`, `fecha_objetivo`, `tecnico_ids`, `origen`, `tokens_input`, `tokens_output`, `duracion_ms`.
- Cada confirmación loguea: `admin_id`, `fecha`, `programaciones_creadas`, `programaciones_actualizadas`, `rutas_generadas`.
- Errores del LLM se loguean con el código de error y los primeros 500 chars de la respuesta (para debug).
- Métricas opcionales (v2): contador de fallbacks, distribución de carga generada, tiempos de generación.

---

## Open Questions

Ninguna pendiente. Todas las decisiones fueron cerradas durante la fase de propuesta. Si surgen durante apply, se documentan aquí explícitamente antes de implementar.
