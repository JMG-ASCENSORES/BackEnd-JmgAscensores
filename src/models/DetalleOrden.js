const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DetalleOrden = sequelize.define('DetalleOrden', {
  detalle_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orden_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  // Solo se usa si es mantenimiento
  tarea_maestra_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  realizado: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Para checklists de mantenimiento: true = realizado, false = no realizado'
  },
  // Solo se usa si es reparación o trabajo general
  accion_realizada: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Texto descriptivo de las acciones manuales realizadas'
  }
}, {
  tableName: 'DetallesOrden',
  timestamps: false
});

module.exports = DetalleOrden;
