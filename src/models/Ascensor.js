const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ascensor = sequelize.define('Ascensor', {
  ascensor_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cliente_id: {
    type: DataTypes.INTEGER
  },
  tipo_equipo: {
    type: DataTypes.STRING(50)
  },
  marca: {
    type: DataTypes.STRING(100)
  },
  modelo: {
    type: DataTypes.STRING(100)
  },
  numero_serie: {
    type: DataTypes.STRING(100),
    unique: true
  },
  capacidad_kg: {
    type: DataTypes.INTEGER
  },
  capacidad_personas: {
    type: DataTypes.INTEGER
  },
  piso_cantidad: {
    type: DataTypes.INTEGER
  },
  fecha_ultimo_mantenimiento: {
    type: DataTypes.DATEONLY
  },
  estado: {
    type: DataTypes.STRING(50)
  },
  observaciones: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'Ascensores',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Ascensor;
