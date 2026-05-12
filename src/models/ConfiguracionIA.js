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
    validate: { isIn: [['mantenimiento', 'reparacion', 'inspeccion', 'emergencia']] }
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
