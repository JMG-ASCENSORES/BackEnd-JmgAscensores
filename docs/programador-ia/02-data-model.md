# Modelos de Datos — Programador IA

## Modelos existentes relevantes

### `Programacion` (tabla `Programaciones`)

El modelo central del sistema de scheduling. Una `Programacion` = un trabajo asignado a uno o más técnicos en una fecha y hora.

```javascript
{
  programacion_id:      INTEGER PK autoincrement,
  titulo:               STRING(100) NOT NULL,
  fecha_inicio:         DATETIME NOT NULL,   // incluye hora
  fecha_fin:            DATETIME NOT NULL,   // incluye hora
  trabajador_id:        INTEGER FK → Trabajadores  // técnico 1 (principal)
  tecnico2_id:          INTEGER FK → Trabajadores  // técnico 2 (opcional)
  tecnico3_id:          INTEGER FK → Trabajadores  // técnico 3 (opcional)
  tecnico4_id:          INTEGER FK → Trabajadores  // técnico 4 (opcional)
  cliente_id:           INTEGER FK → Clientes
  ascensor_id:          INTEGER FK → Ascensores
  tipo_trabajo:         ENUM('mantenimiento','reparacion','inspeccion','emergencia')
  estado:               ENUM('pendiente','en_progreso','completado','cancelado')
  color:                STRING(20) default '#3788d8'
  descripcion:          TEXT
  mantenimiento_fijo_id: INTEGER FK → MantenimientosFijos  // null si no viene de plan fijo
  fecha_creacion:       createdAt
  fecha_actualizacion:  updatedAt
}
```

**Relevancia para el módulo**:
- El motor lee `Programaciones` existentes para calcular la carga del técnico.
- Al confirmar, el módulo `INSERT`s nuevas `Programaciones` (vienen de MantenimientoFijo) o hace `UPDATE` a las pendientes sin técnico.
- El campo `descripcion` puede usarse para registrar la justificación del LLM.

---

### `MantenimientoFijo` (tabla `MantenimientosFijos`)

El plan de mantenimiento recurrente por ascensor. Es la **fuente principal de demanda** para el programador.

```javascript
{
  mantenimiento_fijo_id: INTEGER PK autoincrement,
  ascensor_id:           INTEGER FK → Ascensores (UNIQUE — un plan por ascensor)
  trabajador_id:         INTEGER FK → Trabajadores  // técnico preferido (soft constraint)
  dia_mes:               INTEGER 1–31  // qué día del mes se hace
  hora:                  TIME           // hora preferida del cliente
  frecuencia:            ENUM('mensual','bimestral','trimestral')
  activo:                BOOLEAN default true
  fecha_creacion:        createdAt
  fecha_actualizacion:   updatedAt
}
```

**Relevancia para el módulo**:
- Un `MantenimientoFijo` "vence" cuando `dia_mes` coincide con el día de mañana Y no hay `Programacion` reciente para ese ascensor dentro del período de frecuencia.
- Cuando el módulo confirma, crea una nueva `Programacion` con `mantenimiento_fijo_id` apuntando a este registro.
- `trabajador_id` es preferencia soft: el motor la respeta si puede, el LLM la menciona en la justificación.

---

### `Trabajador` (tabla `Trabajadores`)

```javascript
{
  trabajador_id:    INTEGER PK,
  nombre:           STRING(50),
  apellido:         STRING(50),
  especialidad:     ENUM('Técnico General','Técnico de Mantenimiento','Supervisor Técnico','Técnico de Reparaciones'),
  estado_activo:    BOOLEAN
  // ... otros campos de perfil no relevantes para el módulo
}
```

**Relevancia**:
- El selector de técnicos del módulo muestra solo `estado_activo = true`.
- La `especialidad` determina a qué tipos de trabajo puede ir (ver `01-business-rules.md`).

---

### `Cliente` (tabla `Clientes`)

```javascript
{
  cliente_id:       INTEGER PK,
  nombre_comercial: STRING(200),
  ubicacion:        STRING(300),   // dirección textual
  latitud:          FLOAT,         // coordenadas GPS
  longitud:         FLOAT,
  ciudad:           STRING(100),
  distrito:         STRING(100),   // ← CLAVE para la tabla de tiempos
  estado_activo:    BOOLEAN
}
```

**Relevancia**:
- El `distrito` es la clave para consultar la `TablaDistritosLima` y calcular tiempos de traslado.
- `latitud`/`longitud` están disponibles pero no se usan en v1 (la tabla de distritos es suficiente).
- En v2 se podría usar lat/long + Google Distance Matrix para mayor precisión.

---

### `Ascensor` (tabla `Ascensores`)

```javascript
{
  ascensor_id:  INTEGER PK,
  cliente_id:   INTEGER FK → Clientes,
  tipo_equipo:  STRING(50),
  marca:        STRING(100),
  modelo:       STRING(100),
  estado:       STRING(50)
}
```

**Relevancia**:
- El módulo incluye `tipo_equipo` en el contexto del LLM para que pueda sugerir el perfil técnico más adecuado (ej. un ascensor hidráulico puede requerir Técnico de Reparaciones).
- El join `Ascensor → Cliente` es necesario para obtener el `distrito`.

---

### `RutaDiaria` (tabla `RutasDiarias`)

```javascript
{
  ruta_id:       INTEGER PK,
  trabajador_id: INTEGER FK → Trabajadores,
  fecha_ruta:    DATEONLY,
  numero_paradas: INTEGER,
  hora_inicio:   TIME,
  hora_fin:      TIME,
  estado_ruta:   STRING(50)   // 'planificada', 'en_progreso', 'completada'
  fecha_creacion: createdAt
}
```

**Relevancia**:
- Al confirmar la propuesta, el módulo crea (o actualiza si ya existe) un `RutaDiaria` por técnico para el día objetivo.
- `hora_inicio` = hora de la primera parada del día.
- `hora_fin` = hora de fin de la última parada.
- `numero_paradas` = cantidad de trabajos asignados al técnico ese día.

---

### `DetalleRuta` (tabla `DetalleRuta`) — ⚠️ requiere migración

Estado actual del modelo:
```javascript
{
  detalle_ruta_id:          INTEGER PK,
  ruta_id:                  INTEGER FK → RutasDiarias,
  hora_llegada:             TIME,
  hora_salida:              TIME,
  ubicacion_gps_llegada:    STRING(100),
  ubicacion_gps_salida:     STRING(100)
}
```

**Problema crítico**: no tiene `programacion_id` ni `cliente_id` ni `ascensor_id`. Imposible saber qué trabajo corresponde a qué parada. Para que el módulo funcione, **debe agregarse `programacion_id`** (ver `09-database-migrations.md`, Migración 1).

Estado requerido:
```javascript
{
  detalle_ruta_id:          INTEGER PK,
  ruta_id:                  INTEGER FK → RutasDiarias,
  programacion_id:          INTEGER FK → Programaciones  // ← NUEVO (nullable para compatibilidad)
  orden_parada:             INTEGER                       // ← NUEVO (1, 2, 3... por técnico)
  hora_llegada:             TIME,
  hora_salida:              TIME,
  ubicacion_gps_llegada:    STRING(100),
  ubicacion_gps_salida:     STRING(100)
}
```

---

## Nuevas tablas necesarias

### `ConfiguracionIA` (nueva tabla)

Almacena los parámetros configurables del motor y el LLM. Permite ajustar duraciones y técnicos requeridos sin tocar código.

```sql
CREATE TABLE ConfiguracionIA (
  config_id           INT PRIMARY KEY AUTO_INCREMENT,
  tipo_trabajo        VARCHAR(50) NOT NULL,  -- mantenimiento|reparacion|inspeccion|emergencia
  duracion_min        INT NOT NULL,          -- minutos estimados de duración
  tecnicos_requeridos INT NOT NULL DEFAULT 1,-- técnicos asignados por defecto
  prioridad           INT NOT NULL,          -- 1=máxima (emergencia), 4=rutina
  hora_inicio_default TIME NOT NULL DEFAULT '08:30:00',
  hora_fin_limite     TIME NOT NULL DEFAULT '18:30:00',
  activo              BOOLEAN DEFAULT true,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

Seed inicial:
```sql
INSERT INTO ConfiguracionIA (tipo_trabajo, duracion_min, tecnicos_requeridos, prioridad) VALUES
  ('emergencia',    90,  1, 1),
  ('reparacion',   120,  1, 2),
  ('inspeccion',    45,  1, 3),
  ('mantenimiento', 60,  1, 4);
```

---

### `TablaDistritosLima` (nueva tabla)

Almacena la matriz de tiempos entre distritos. Ver valores completos en `06-district-time-matrix.md`.

```sql
CREATE TABLE TablaDistritosLima (
  id                INT PRIMARY KEY AUTO_INCREMENT,
  distrito_origen   VARCHAR(100) NOT NULL,
  distrito_destino  VARCHAR(100) NOT NULL,
  tiempo_min        INT NOT NULL,           -- minutos estimados con buffer de tráfico
  activo            BOOLEAN DEFAULT true,
  UNIQUE KEY uk_ruta (distrito_origen, distrito_destino)
);
```

---

## Diagrama de relaciones (simplificado para el módulo)

```
MantenimientoFijo ──────────────────────── Ascensor ─── Cliente
     │ (genera)                               │              │
     │                                        │              │ .distrito
     ▼                                        │              ▼
Programacion ◄──────────────────────────────┘       TablaDistritosLima
     │ .trabajador_id / tecnico2..4_id              (tiempos de traslado)
     │
     ▼
  Trabajador
     │ .especialidad
     │
     ├── RutaDiaria (por técnico × día)
     │        │
     │        └── DetalleRuta (orden_parada, programacion_id ← NUEVO)
     │
     └── ConfiguracionIA (duraciones por tipo)
```

---

## Joins necesarios para la query de demanda

El módulo necesita obtener, para cada trabajo de la demanda, estos campos mínimos:

| Campo | Tabla origen |
|---|---|
| `programacion_id` (null si es MantenimientoFijo nuevo) | `Programaciones` |
| `mantenimiento_fijo_id` | `MantenimientosFijos` |
| `ascensor_id` | `Ascensores` |
| `tipo_equipo` del ascensor | `Ascensores` |
| `cliente_id` | `Clientes` |
| `nombre_comercial` | `Clientes` |
| `distrito` | `Clientes` |
| `tipo_trabajo` | `Programaciones` / inferido de MantenimientoFijo |
| `hora_preferida` | `MantenimientosFijos.hora` |
| `tecnico_preferido_id` | `MantenimientosFijos.trabajador_id` |

Ver queries exactas en `03-demand-sources.md`.
