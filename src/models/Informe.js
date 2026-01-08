const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Informe = sequelize.define('Informe', {
  informe_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mantenimiento_id: {
    type: DataTypes.INTEGER
  },
  asignacion_id: {
    type: DataTypes.INTEGER
  },
  trabajador_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ascensor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  admin_id: {
    type: DataTypes.INTEGER
  },
  tipo_informe: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['tecnico', 'mantenimiento', 'inspeccion']]
    }
  },
  numero_informe: {
    type: DataTypes.STRING(50),
    unique: true
  },
  descripcion_trabajo: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  tipo_servicio: {
    type: DataTypes.STRING(100)
  },
  acciones_realizadas: {
    type: DataTypes.TEXT
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  recomendaciones: {
    type: DataTypes.TEXT
  },
  ubicacion_gps: {
    type: DataTypes.STRING(100)
  },
  fecha_informe: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  hora_inicio: {
    type: DataTypes.TIME
  },
  hora_fin: {
    type: DataTypes.TIME
  },
  firma_tecnico: {
    type: DataTypes.TEXT
  },
  firma_cliente: {
    type: DataTypes.TEXT
  },
  url_documento: {
    type: DataTypes.STRING(255)
  },
  estado_informe: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['borrador', 'firmado', 'aprobado', 'rechazado']]
    }
  },
  firmado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fecha_firma: {
    type: DataTypes.DATE
  },
  aprobado_por: {
    type: DataTypes.INTEGER
  },
  fecha_aprobacion: {
    type: DataTypes.DATE
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'Informes',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Informe;
