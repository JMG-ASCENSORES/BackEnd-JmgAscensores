# Migraciones de Base de Datos — Programador IA

Todas las migraciones son **aditivas** — no modifican datos existentes ni cambian semántica de columnas existentes. Se pueden aplicar en producción sin downtime si se sigue el orden indicado.

---

## Migración 1 — Agregar `programacion_id` y `orden_parada` a `DetalleRuta`

**Propósito**: vincular cada parada de una ruta al trabajo específico que la generó. Sin esto, la ruta no tiene semántica de negocio.

**Impacto en datos existentes**: ninguno. Las filas existentes quedarán con `programacion_id = NULL` y `orden_parada = NULL`. Son nullable exactamente para compatibilidad retroactiva.

```sql
ALTER TABLE DetalleRuta
  ADD COLUMN programacion_id  INT NULL
    REFERENCES Programaciones(programacion_id)
    ON DELETE SET NULL
    ON UPDATE CASCADE,
  ADD COLUMN orden_parada     INT NULL
    COMMENT '1-based, secuencia de paradas del técnico en el día';

-- Índice para buscar paradas por programación
CREATE INDEX idx_detalle_ruta_programacion
  ON DetalleRuta (programacion_id);

-- Índice para ordenar paradas dentro de una ruta
CREATE INDEX idx_detalle_ruta_orden
  ON DetalleRuta (ruta_id, orden_parada);
```

---

## Migración 2 — Crear tabla `ConfiguracionIA`

**Propósito**: almacenar duraciones estimadas y técnicos requeridos por tipo de trabajo, de forma configurable sin tocar código.

```sql
CREATE TABLE ConfiguracionIA (
  config_id             INT          NOT NULL AUTO_INCREMENT,
  tipo_trabajo          VARCHAR(50)  NOT NULL
    COMMENT 'mantenimiento | reparacion | inspeccion | emergencia',
  duracion_min          INT          NOT NULL
    COMMENT 'Duración estimada del trabajo en minutos',
  tecnicos_requeridos   INT          NOT NULL DEFAULT 1
    COMMENT 'Técnicos asignados por defecto a este tipo de trabajo',
  prioridad             INT          NOT NULL
    COMMENT '1=emergencia (más alto), 4=mantenimiento (rutina)',
  hora_inicio_default   TIME         NOT NULL DEFAULT '08:30:00'
    COMMENT 'Hora de inicio de jornada laboral (puede sobreescribirse)',
  hora_fin_limite       TIME         NOT NULL DEFAULT '18:30:00'
    COMMENT 'Hora máxima de fin de jornada. Ningún trabajo puede terminar después.',
  activo                BOOLEAN      NOT NULL DEFAULT true,
  fecha_actualizacion   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
    ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (config_id),
  UNIQUE KEY uk_tipo_trabajo (tipo_trabajo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Datos iniciales
INSERT INTO ConfiguracionIA
  (tipo_trabajo, duracion_min, tecnicos_requeridos, prioridad)
VALUES
  ('emergencia',    90, 1, 1),
  ('reparacion',   120, 1, 2),
  ('inspeccion',    45, 1, 3),
  ('mantenimiento', 60, 1, 4);
```

---

## Migración 3 — Crear tabla `TablaDistritosLima`

**Propósito**: almacenar el tiempo estimado de traslado en transporte público entre distritos de Lima, con buffer de tráfico. Es la fuente de verdad para el motor determinista.

```sql
CREATE TABLE TablaDistritosLima (
  id                INT          NOT NULL AUTO_INCREMENT,
  distrito_origen   VARCHAR(100) NOT NULL,
  distrito_destino  VARCHAR(100) NOT NULL,
  tiempo_min        INT          NOT NULL
    COMMENT 'Minutos estimados de traslado bus+caminata+buffer tráfico 30%',
  activo            BOOLEAN      NOT NULL DEFAULT true,
  PRIMARY KEY (id),
  UNIQUE KEY uk_ruta (distrito_origen, distrito_destino),
  INDEX idx_origen (distrito_origen),
  INDEX idx_destino (distrito_destino)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Seed completo de `TablaDistritosLima`

Ver la tabla completa en `06-district-time-matrix.md`. El script SQL completo de INSERT se encuentra en `scripts/seed-district-times.sql` (a crear durante Fase 0).

Forma del seed (extracto):
```sql
INSERT INTO TablaDistritosLima (distrito_origen, distrito_destino, tiempo_min) VALUES
-- Mismo distrito
('Cercado de Lima',  'Cercado de Lima',  0),
('San Isidro',       'San Isidro',       0),
('Miraflores',       'Miraflores',       0),
-- ... resto de diagonales

-- Rutas asimétricas (tabla es simétrica, se insertan ambas direcciones)
('Cercado de Lima', 'Breña',             20),
('Breña',           'Cercado de Lima',   20),
('Cercado de Lima', 'La Victoria',       25),
('La Victoria',     'Cercado de Lima',   25),
('San Isidro',      'Miraflores',        20),
('Miraflores',      'San Isidro',        20),
-- ... continúa para todos los pares
;
```

**Nota sobre mismo distrito**: la diagonal puede ser 0 (no hay traslado) o 15 (traslado interno entre puntos del distrito). El motor usa 15 minutos cuando `distrito_origen = distrito_destino` como tiempo mínimo de traslado interno. Si la tabla tiene 0, el servicio aplica el mínimo de 15 automáticamente.

---

## Migración 4 — Modelo Sequelize para las tablas nuevas

Crear archivos de modelo en `/BackEnd-JmgAscensores/src/models/`:

### `ConfiguracionIA.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ConfiguracionIA = sequelize.define('ConfiguracionIA', {
  config_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipo_trabajo: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { isIn: [['mantenimiento','reparacion','inspeccion','emergencia']] }
  },
  duracion_min: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tecnicos_requeridos: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  prioridad: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  hora_inicio_default: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '08:30:00'
  },
  hora_fin_limite: {
    type: DataTypes.TIME,
    allowNull: false,
    defaultValue: '18:30:00'
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'ConfiguracionIA',
  timestamps: true,
  createdAt: false,
  updatedAt: 'fecha_actualizacion'
});

module.exports = ConfiguracionIA;
```

### `TablaDistritoLima.js`

```javascript
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TablaDistritoLima = sequelize.define('TablaDistritoLima', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  distrito_origen: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  distrito_destino: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  tiempo_min: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'TablaDistritosLima',
  timestamps: false
});

module.exports = TablaDistritoLima;
```

---

## Migración 5 — Actualizar asociaciones en `index.js` de models

En `/BackEnd-JmgAscensores/src/models/index.js`, agregar:

```javascript
const ConfiguracionIA     = require('./ConfiguracionIA');
const TablaDistritoLima   = require('./TablaDistritoLima');

// Asociación DetalleRuta → Programacion (nueva)
DetalleRuta.belongsTo(Programacion, { foreignKey: 'programacion_id', as: 'programacion' });
Programacion.hasMany(DetalleRuta,   { foreignKey: 'programacion_id', as: 'detallesRuta' });
```

---

## Orden de ejecución

```
Migración 1  →  Migración 2  →  Migración 3  →  Migración 4  →  Migración 5
   (ALTER)       (CREATE)        (CREATE+seed)   (modelos JS)    (asociaciones)
```

Las migraciones 2, 3 y 4 son independientes entre sí y pueden ejecutarse en paralelo. La 5 depende de la 4. La 1 es independiente de todas.

---

## Rollback (si es necesario)

```sql
-- Rollback Migración 1
ALTER TABLE DetalleRuta
  DROP FOREIGN KEY fk_detalle_programacion,  -- nombre puede variar
  DROP COLUMN programacion_id,
  DROP COLUMN orden_parada;

-- Rollback Migración 2
DROP TABLE IF EXISTS ConfiguracionIA;

-- Rollback Migración 3
DROP TABLE IF EXISTS TablaDistritosLima;
```

Los modelos JS y asociaciones (Migraciones 4-5) se revierten borrando los archivos nuevos y quitando las líneas del index.js.
