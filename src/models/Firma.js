const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Firma = sequelize.define('Firma', {
  firma_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  base64_data: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  tableName: 'Firmas',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Firma;
