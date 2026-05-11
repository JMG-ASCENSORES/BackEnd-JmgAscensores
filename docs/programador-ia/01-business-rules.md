# Reglas de Negocio — Programador IA

Este documento es la fuente de verdad para todas las reglas que el **motor determinista** aplica como restricciones duras, y que el **LLM** recibe como contexto inmutable en el system prompt.

---

## 1. Ventana laboral

| Parámetro | Valor default | Configurable |
|---|---|---|
| Hora inicio | 08:30 | Sí (por técnico o por día) |
| Hora fin | 18:30 | Sí (con override explícito del admin) |

**Regla dura**: ninguna `Programacion` generada por el módulo puede tener `fecha_fin` posterior a las 18:30, salvo que el admin haga override explícito con justificación. El override queda registrado en el campo `descripcion` de la `Programacion`.

Si al secuenciar las paradas un trabajo no cabe dentro de la ventana, se clasifica como **overflow** y se devuelve en la propuesta con `overflow: true`. El admin decide qué hacer con él (moverlo a otro técnico, dejar para otro día, o autorizar horario extendido).

---

## 2. Especialidades de técnicos y tipos de trabajo

### Especialidades existentes (ENUM en `Trabajadores.especialidad`)

| Especialidad | Descripción operativa |
|---|---|
| `Técnico General` | Mantenimientos rutinarios, apoyo en inspecciones. No habilitado para reparaciones complejas ni emergencias graves. |
| `Técnico de Mantenimiento` | Especialista en mantenimientos preventivos periódicos. Principal perfil para la carga diaria. |
| `Supervisor Técnico` | Habilita todos los tipos de trabajo. Realiza inspecciones formales y supervisa equipos en trabajos complejos. |
| `Técnico de Reparaciones` | Único perfil habilitado para reparaciones y emergencias técnicas. |

### Tipos de trabajo existentes (ENUM en `Programaciones.tipo_trabajo`)

| Tipo | Prioridad | Duración estimada default | Técnicos default | Especialidades habilitadas |
|---|---|---|---|---|
| `emergencia` | 1 (máxima) | 90 min | 1 | Todos |
| `reparacion` | 2 | 120 min | 1 (máx 2) | `Técnico de Reparaciones`, `Supervisor Técnico` |
| `inspeccion` | 3 | 45 min | 1 | `Supervisor Técnico`, `Técnico General` |
| `mantenimiento` | 4 (rutinario) | 60 min | 1 | `Técnico General`, `Técnico de Mantenimiento`, `Supervisor Técnico` |

> **Importante**: estos valores son el **default configurable** almacenado en `ConfiguracionIA` (ver `09-database-migrations.md`). El motor los lee de la BD, no los tiene hardcodeados. El admin puede ajustarlos desde Configuración sin tocar código.

### Matriz de elegibilidad (restricción dura)

```
                    Técnico   Técnico de    Supervisor   Técnico de
                    General   Mantenimiento  Técnico     Reparaciones
mantenimiento         ✓           ✓             ✓            ✗
reparacion            ✗           ✗             ✓            ✓
inspeccion            ✓           ✗             ✓            ✗
emergencia            ✓           ✓             ✓            ✓
```

> `emergencia` habilita a todos porque en situación de emergencia cualquier técnico puede asistir (criterio del administrador). Si el admin quiere restringir esto, lo hace con el override manual en la propuesta antes de confirmar.

### Técnicos requeridos por tipo (inferencia, no campo en BD)

| Tipo | Técnicos mínimos | Técnicos máximos | Notas |
|---|---|---|---|
| `mantenimiento` | 1 | 1 | Siempre individual |
| `reparacion` | 1 | 2 | El motor asigna 1; el LLM puede sugerir 2 si el ascensor tiene `tipo_equipo` complejo |
| `inspeccion` | 1 | 1 | Siempre individual |
| `emergencia` | 1 | 1 | Siempre individual (si necesita más, se coordina por fuera) |

---

## 3. Prioridad de asignación

El motor ordena los trabajos para asignarlos en este orden:

1. **Emergencias** — se asignan primero, con el primer técnico elegible disponible.
2. **Reparaciones** — segundo en prioridad, similar a emergencias pero con ventana más flexible.
3. **Inspecciones** — tercer lugar.
4. **Mantenimientos** — base de la carga diaria, se asignan después de cubrir todo lo anterior.

Dentro del mismo tipo, el motor ordena por:
- `MantenimientoFijo.hora` (hora preferida del cliente si viene de plan fijo) — si existe.
- Distrito del cliente (clustering — se agrupa lo más cercano).

---

## 4. Frecuencias de MantenimientoFijo

| `frecuencia` | Significado | Lógica de verificación para "vence mañana" |
|---|---|---|
| `mensual` | Cada mes en el mismo día | `dia_mes = DAY(mañana)` Y no hay `Programacion` para este `ascensor_id` + `mantenimiento_fijo_id` en los últimos 25 días |
| `bimestral` | Cada 2 meses | `dia_mes = DAY(mañana)` Y no hay `Programacion` en los últimos 55 días |
| `trimestral` | Cada 3 meses | `dia_mes = DAY(mañana)` Y no hay `Programacion` en los últimos 85 días |

> **Margen en días**: se usa un margen menor a los días exactos del período para capturar meses cortos (febrero) sin fallar.

---

## 5. Regla de no solapamiento

Un técnico no puede estar asignado a dos trabajos cuyo horario se solape. El motor lo garantiza al secuenciar paradas. Si el LLM hace un ajuste que produce solapamiento, el backend lo detecta antes de devolver la propuesta y revierte ese ajuste específico.

Validación: para cada técnico, se verifica que para toda parada `n` se cumpla:
```
hora_fin(n) + traslado_a(n+1) <= hora_inicio(n+1)
```

---

## 6. Regla de `MantenimientoFijo.trabajador_id`

Algunos `MantenimientoFijo` tienen un técnico preferido (`trabajador_id`). Esta es una **preferencia soft**, no una restricción dura:
- El motor la respeta si ese técnico está entre los seleccionados para el día y tiene capacidad.
- Si el técnico preferido no está seleccionado o está saturado, el motor asigna al siguiente elegible.
- El LLM recibe esta preferencia como contexto y puede mencionarla en la justificación.

---

## 7. Qué NO puede hacer el módulo (límites de v1)

- No crea trabajos de la nada. Solo programa demanda preexistente (MantenimientoFijo vencidos o Programaciones pendientes sin técnico).
- No modifica `Programaciones` ya confirmadas con técnico asignado (estado ≠ 'pendiente' o trabajador_id ≠ null). Solo lee esas para calcular la carga del técnico.
- No programa emergencias sin fecha (v2).
- No resuelve trabajos que requieran más de 1 técnico en v1 (múltiples técnicos en el mismo trabajo se dejan para v2).
- No envía notificaciones a los técnicos (eso queda para el flujo de Programaciones existente).
