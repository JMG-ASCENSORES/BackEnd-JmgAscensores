const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const HistorialEstadoMantenimiento = sequelize.define('HistorialEstadoMantenimiento', {
  historial_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mantenimiento_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  estado_anterior: {
    type: DataTypes.STRING(50)
  },
  estado_nuevo: {
    type: DataTypes.STRING(50)
  },
  cambio_realizado_por: {
    type: DataTypes.INTEGER
  },
  motivo_cambio: {
    type: DataTypes.STRING(255)
  },
  fecha_cambio: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'HistorialEstadoMantenimiento',
  timestamps: false
});

module.exports = HistorialEstadoMantenimiento;
