# Spec Deltas: programador-ia

Capability nueva agregada por este cambio. Los escenarios están en formato GIVEN/WHEN/THEN y son la fuente de verdad funcional — cualquier implementación debe cumplir todos ellos.

---

## ADDED Capability: `ai-scheduling`

Permite al administrador generar propuestas automáticas de programación diaria para técnicos, revisarlas y confirmarlas con persistencia transaccional.

---

### Requirement: El sistema SHALL exponer únicamente al rol administrador los endpoints de `/api/ia-scheduler/*`

#### Scenario: Acceso denegado para técnico autenticado
- **GIVEN** un técnico autenticado con JWT válido pero sin rol admin
- **WHEN** hace `GET /api/ia-scheduler/demand`
- **THEN** la respuesta es `403 Forbidden`
- **AND** ningún dato de demanda es devuelto

#### Scenario: Acceso permitido para administrador
- **GIVEN** un administrador autenticado con JWT válido
- **WHEN** hace `GET /api/ia-scheduler/demand?fecha=2026-05-13`
- **THEN** la respuesta es `200 OK` con la lista de trabajos pendientes

#### Scenario: Acceso denegado sin autenticación
- **GIVEN** un request sin header `Authorization`
- **WHEN** llega a cualquier endpoint de `/api/ia-scheduler/*`
- **THEN** la respuesta es `401 Unauthorized`

---

### Requirement: El sistema SHALL identificar y retornar los trabajos pendientes para una fecha objetivo combinando dos fuentes de demanda

#### Scenario: MantenimientoFijo vencido aparece en la demanda
- **GIVEN** un `MantenimientoFijo` con `activo=true`, `dia_mes=15`, `frecuencia='mensual'`
- **AND** no existe `Programacion` para ese `ascensor_id` + `mantenimiento_fijo_id` en los últimos 25 días
- **WHEN** se consulta `GET /api/ia-scheduler/demand?fecha=2026-05-15`
- **THEN** el trabajo aparece en `trabajos[]` con `fuente='mantenimiento_fijo'` y `tipo_trabajo='mantenimiento'`

#### Scenario: MantenimientoFijo ya cubierto NO aparece
- **GIVEN** un `MantenimientoFijo` con `dia_mes=15`, `frecuencia='mensual'`
- **AND** ya existe una `Programacion` confirmada hace 10 días para ese ascensor
- **WHEN** se consulta la demanda para el día 15
- **THEN** ese MantenimientoFijo NO aparece en la lista

#### Scenario: Programacion pendiente sin técnico aparece
- **GIVEN** una `Programacion` con `fecha_inicio` en la fecha objetivo, `estado='pendiente'`, `trabajador_id=NULL`
- **WHEN** se consulta la demanda para esa fecha
- **THEN** el trabajo aparece con `fuente='programacion_pendiente'` y su `programacion_id` poblado

#### Scenario: Deduplicación entre fuentes
- **GIVEN** un `MantenimientoFijo` vencido para mañana con `ascensor_id=8`
- **AND** una `Programacion` pendiente sin técnico para mañana con `ascensor_id=8`
- **WHEN** se consulta la demanda
- **THEN** el trabajo aparece UNA sola vez, priorizando la `Programacion` ya existente

#### Scenario: Cliente inactivo se excluye
- **GIVEN** un `MantenimientoFijo` vencido cuyo cliente tiene `estado_activo=false`
- **WHEN** se consulta la demanda
- **THEN** el trabajo NO aparece en la lista

---

### Requirement: El sistema SHALL listar los técnicos activos con su carga preexistente para la fecha objetivo

#### Scenario: Lista solo técnicos activos
- **GIVEN** 5 técnicos en BD, 2 con `estado_activo=false`
- **WHEN** se consulta `GET /api/ia-scheduler/tecnicos?fecha=2026-05-13`
- **THEN** la respuesta contiene exactamente 3 técnicos

#### Scenario: Carga preexistente refleja Programaciones confirmadas
- **GIVEN** un técnico con 2 `Programaciones` ya confirmadas para mañana (60 min cada una)
- **WHEN** se consulta su carga
- **THEN** `carga_preexistente.trabajos_confirmados = 2` y `minutos_comprometidos = 120`

#### Scenario: Técnico sin trabajos previos
- **GIVEN** un técnico activo sin Programaciones para mañana
- **WHEN** se consulta su carga
- **THEN** `carga_preexistente = { trabajos_confirmados: 0, minutos_comprometidos: 0, ultima_hora_fin: null }`

---

### Requirement: El motor determinista SHALL asignar técnicos respetando la matriz de elegibilidad por especialidad

#### Scenario: Reparación no se asigna a Técnico de Mantenimiento
- **GIVEN** un trabajo con `tipo_trabajo='reparacion'`
- **AND** los técnicos seleccionados son un `Técnico de Mantenimiento` y un `Supervisor Técnico`
- **WHEN** el motor genera la propuesta
- **THEN** el trabajo se asigna al `Supervisor Técnico`
- **AND** nunca al `Técnico de Mantenimiento`

#### Scenario: Mantenimiento se asigna a especialidades permitidas
- **GIVEN** un trabajo `tipo_trabajo='mantenimiento'`
- **AND** los técnicos disponibles incluyen un `Técnico General`, `Técnico de Mantenimiento` y `Técnico de Reparaciones`
- **WHEN** el motor genera la propuesta
- **THEN** el trabajo se asigna al `Técnico General` o `Técnico de Mantenimiento`
- **AND** nunca al `Técnico de Reparaciones`

#### Scenario: Sin técnico elegible disponible
- **GIVEN** un trabajo `tipo_trabajo='reparacion'`
- **AND** los técnicos seleccionados son todos `Técnico de Mantenimiento` (no elegibles)
- **WHEN** el motor genera la propuesta
- **THEN** el trabajo aparece en `sin_elegible[]` y NO en ningún técnico
- **AND** la respuesta incluye una nota explicando el motivo

---

### Requirement: El motor SHALL respetar la ventana laboral 08:30-18:30 como restricción dura

#### Scenario: Trabajo cabe en jornada normal
- **GIVEN** un técnico con 3 trabajos asignados que suman 4 horas incluidos traslados
- **WHEN** el motor calcula horarios desde 08:30
- **THEN** `hora_fin` del último trabajo es ≤ 18:30
- **AND** ningún trabajo tiene `overflow=true`

#### Scenario: Trabajo no cabe genera overflow
- **GIVEN** un técnico con 8 trabajos asignados que sumarían 12 horas
- **WHEN** el motor calcula horarios
- **THEN** los trabajos que no caben antes de 18:30 aparecen en `overflow[]`
- **AND** NO aparecen en `tecnico.trabajos[]`
- **AND** cada item de overflow tiene `razon_overflow` descriptivo

#### Scenario: Horario inicio respeta carga preexistente
- **GIVEN** un técnico con un trabajo previo confirmado que termina a las 11:00
- **WHEN** el motor le asigna nuevos trabajos
- **THEN** el primer trabajo nuevo tiene `hora_inicio ≥ 11:15` (15 min de margen)

---

### Requirement: El motor SHALL balancear la carga entre técnicos seleccionados y respetar el técnico preferido del MantenimientoFijo cuando sea viable

#### Scenario: Técnico preferido con capacidad lo recibe
- **GIVEN** un MantenimientoFijo con `trabajador_id=3` (preferido)
- **AND** el técnico 3 está seleccionado y tiene <8 horas de carga
- **WHEN** el motor asigna ese trabajo
- **THEN** se asigna al técnico 3
- **AND** `tecnico_preferido_respetado=true`

#### Scenario: Técnico preferido saturado se ignora
- **GIVEN** un MantenimientoFijo con `trabajador_id=3`
- **AND** el técnico 3 ya tiene 9.5 horas de carga acumulada
- **WHEN** el motor asigna ese trabajo
- **THEN** se asigna a otro técnico elegible con menor carga
- **AND** `tecnico_preferido_respetado=false`

#### Scenario: Distribución balanceada entre técnicos con la misma especialidad
- **GIVEN** 6 trabajos `tipo_trabajo='mantenimiento'` y 3 `Técnico de Mantenimiento` disponibles
- **WHEN** el motor asigna
- **THEN** cada técnico recibe 2 trabajos (diferencia máxima de carga entre técnicos ≤ 1 trabajo)

---

### Requirement: El motor SHALL secuenciar las paradas de cada técnico minimizando el tiempo total de traslado entre distritos

#### Scenario: Trabajos en mismo distrito se agrupan
- **GIVEN** un técnico con 4 trabajos: 2 en Miraflores, 2 en San Borja
- **WHEN** el motor secuencia las paradas
- **THEN** los 2 de Miraflores quedan consecutivos
- **AND** los 2 de San Borja quedan consecutivos

#### Scenario: Nearest-neighbor ordena por proximidad
- **GIVEN** un técnico con trabajos en: La Molina, Miraflores, Surco
- **AND** la tabla indica Miraflores→Surco=35min, Surco→La Molina=35min, Miraflores→La Molina=55min
- **WHEN** el motor secuencia partiendo de Cercado de Lima
- **THEN** un orden válido es Miraflores → Surco → La Molina (minimiza traslados)

#### Scenario: Hora fija respeta su slot
- **GIVEN** una Programacion ya creada con `fecha_inicio=10:00` específico
- **WHEN** el motor secuencia las paradas del técnico
- **THEN** ese trabajo aparece exactamente a las 10:00
- **AND** los demás trabajos se acomodan antes/después sin solaparse

---

### Requirement: El sistema SHALL ejecutar Motor + LLM en cascada automática y devolver una propuesta única validada

#### Scenario: Cascada exitosa
- **GIVEN** el motor genera una propuesta válida
- **AND** la API de Claude responde correctamente
- **WHEN** `POST /api/ia-scheduler/generar` se completa
- **THEN** la respuesta tiene `origen='llm'`
- **AND** cada trabajo tiene `justificacion` poblada con al menos 10 caracteres

#### Scenario: Fallback al motor si el LLM falla
- **GIVEN** el motor genera una propuesta válida
- **AND** la API de Claude responde con error de red o timeout >10s
- **WHEN** el endpoint termina
- **THEN** la respuesta tiene `origen='motor_fallback'`
- **AND** la propuesta es la del motor sin modificaciones
- **AND** `advertencias[]` contiene el motivo del fallback

#### Scenario: Validación post-LLM revierte cambios inválidos
- **GIVEN** el LLM devuelve una propuesta que asigna `tipo_trabajo='reparacion'` a un `Técnico de Mantenimiento`
- **WHEN** el backend valida la respuesta
- **THEN** ese cambio específico se revierte al valor del motor
- **AND** `advertencias[]` registra: `{ tipo: 'elegibilidad_invalida', ... }`
- **AND** el resto de cambios del LLM se mantienen

#### Scenario: LLM devuelve JSON no parseable
- **GIVEN** el LLM responde con texto que no es JSON válido
- **WHEN** `parsearRespuesta` intenta el parse
- **THEN** se loguea el error con los primeros 500 chars de la respuesta
- **AND** la respuesta del endpoint tiene `origen='motor_fallback'`

---

### Requirement: El sistema SHALL permitir ajustes incrementales sobre una propuesta vía chat de instrucciones en lenguaje natural

#### Scenario: Instrucción simple aplicada
- **GIVEN** una propuesta existente con un trabajo en Surquillo asignado a Carlos
- **WHEN** el admin envía `POST /api/ia-scheduler/ajustar` con `instruccion='Mové el trabajo de Surquillo a Pedro'`
- **THEN** la respuesta muestra ese trabajo asignado a Pedro
- **AND** los demás trabajos permanecen sin cambios significativos

#### Scenario: Instrucción que viola reglas se rechaza
- **GIVEN** una propuesta con un trabajo `tipo_trabajo='reparacion'` asignado a un Supervisor
- **WHEN** el admin envía `instruccion='Asignalo a Carlos'` (Carlos es Técnico de Mantenimiento)
- **THEN** la propuesta NO cambia ese trabajo
- **AND** `advertencias[]` indica que el ajuste viola la matriz de elegibilidad

#### Scenario: Cada llamada de ajuste es stateless
- **GIVEN** el admin hizo dos ajustes previos en el chat
- **WHEN** envía un tercer ajuste
- **THEN** el backend NO acumula los mensajes anteriores en el contexto del LLM
- **AND** la propuesta enviada al LLM es solo la propuesta actual + la nueva instrucción

---

### Requirement: La confirmación de la propuesta SHALL persistir Programaciones, RutaDiaria y DetalleRuta en una transacción atómica

#### Scenario: Confirmación exitosa de propuesta nueva
- **GIVEN** una propuesta con 3 técnicos × 4 trabajos cada uno, todos viniendo de MantenimientoFijo (`programacion_id=null`)
- **WHEN** `POST /api/ia-scheduler/confirmar` se ejecuta
- **THEN** se crean 12 nuevas Programaciones con `mantenimiento_fijo_id` poblado
- **AND** se crean 3 RutasDiarias (una por técnico)
- **AND** se crean 12 DetalleRuta con `programacion_id` y `orden_parada` (1, 2, 3, 4)
- **AND** la respuesta es `{ ok: true, programaciones_creadas: 12, ... }`

#### Scenario: Confirmación de Programaciones existentes
- **GIVEN** una propuesta donde algunos trabajos tienen `programacion_id` no nulo (eran pendientes sin técnico)
- **WHEN** se confirma
- **THEN** esas Programaciones se actualizan con el `trabajador_id` y los nuevos horarios
- **AND** NO se crean nuevas Programaciones para esos trabajos

#### Scenario: Rollback ante error en mitad de la transacción
- **GIVEN** una propuesta válida
- **AND** durante la confirmación falla un INSERT por restricción de BD
- **WHEN** el backend captura el error
- **THEN** la transacción se rollback completamente
- **AND** ninguna Programacion, RutaDiaria ni DetalleRuta queda persistida
- **AND** la respuesta es `500` con mensaje del error

#### Scenario: Conflicto por modificación externa (optimistic locking)
- **GIVEN** una propuesta generada con `programacion_id=201` (estado='pendiente', trabajador_id=null)
- **AND** entre la generación y la confirmación, otro admin asignó esa Programacion manualmente
- **WHEN** la confirmación intenta el UPDATE
- **THEN** la respuesta es `409 Conflict`
- **AND** se sugiere regenerar la propuesta

---

### Requirement: La configuración del módulo (duraciones, ventana horaria) SHALL ser editable sin redeploy

#### Scenario: Lectura de configuración actual
- **GIVEN** la tabla `ConfiguracionIA` tiene los 4 tipos de trabajo seedeados
- **WHEN** se consulta `GET /api/ia-scheduler/configuracion`
- **THEN** la respuesta lista los 4 tipos con sus duraciones, prioridades y ventana horaria

#### Scenario: Actualización de duración por tipo
- **GIVEN** la configuración inicial: `mantenimiento.duracion_min = 60`
- **WHEN** el admin envía `PUT /api/ia-scheduler/configuracion` con `{ tipo_trabajo: 'mantenimiento', duracion_min: 75 }`
- **THEN** el valor en BD se actualiza a 75
- **AND** la siguiente generación de propuesta usa 75 minutos para mantenimientos

---

### Requirement: Cada parada de la propuesta SHALL incluir información suficiente para que el admin la entienda sin consultar otra fuente

#### Scenario: Información mínima por parada
- **GIVEN** una propuesta confirmada
- **WHEN** el frontend la renderiza
- **THEN** cada parada muestra: `nombre_cliente`, `distrito`, `tipo_trabajo`, `hora_inicio`, `hora_fin`, `duracion_min`, `traslado_desde_anterior`, `justificacion`

#### Scenario: Justificación es legible y específica
- **GIVEN** una propuesta generada con `origen='llm'`
- **WHEN** se inspecciona cualquier trabajo
- **THEN** `justificacion` no es genérica (`"Asignación óptima"`) sino específica (`"Primera parada del día, cliente preferido por plan fijo"` o similar)

---

### Requirement: El sistema SHALL registrar en logs cada generación y cada confirmación para auditoría

#### Scenario: Log de generación
- **GIVEN** un admin solicita `POST /api/ia-scheduler/generar`
- **WHEN** la respuesta se devuelve
- **THEN** se loguea: `admin_id`, `fecha_objetivo`, `tecnico_ids`, `origen`, `tokens_input`, `tokens_output`, `duracion_ms`, `timestamp`

#### Scenario: Log de confirmación
- **GIVEN** un admin confirma una propuesta
- **WHEN** la transacción se completa
- **THEN** se loguea: `admin_id`, `fecha`, `programaciones_creadas`, `programaciones_actualizadas`, `rutas_generadas`, `timestamp`

---

## Notas

- Estos escenarios son ejecutables como tests de integración. La fase de verificación (`sdd-verify`) usará este documento como contrato.
- Los escenarios sobre UI están limitados a contratos de información (qué datos llegan al frontend). El detalle visual está en `docs/programador-ia/08-frontend-ux.md`.
- Cualquier modificación a estos escenarios durante la implementación requiere actualizar este documento explícitamente.
