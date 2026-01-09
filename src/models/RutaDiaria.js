const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const RutaDiaria = sequelize.define('RutaDiaria', {
  ruta_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  trabajador_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fecha_ruta: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  numero_paradas: {
    type: DataTypes.INTEGER
  },
  hora_inicio: {
    type: DataTypes.TIME
  },
  hora_fin: {
    type: DataTypes.TIME
  },
  estado_ruta: {
    type: DataTypes.STRING(50)
  }
}, {
  tableName: 'RutasDiarias',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: false
});

module.exports = RutaDiaria;
