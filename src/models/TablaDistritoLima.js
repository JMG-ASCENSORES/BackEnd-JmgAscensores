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
