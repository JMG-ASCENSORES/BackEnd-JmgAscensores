const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Mantenimiento = sequelize.define('Mantenimiento', {
  mantenimiento_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cliente_id: {
    type: DataTypes.INTEGER
  },
  ascensor_id: {
    type: DataTypes.INTEGER
  },
  titulo: {
    type: DataTypes.STRING(100)
  },
  trabajador_id: {
    type: DataTypes.INTEGER
  },
  tipo_trabajo: {
    type: DataTypes.STRING(50),
    defaultValue: 'mantenimiento'
  },
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#3788d8'
  },
  fecha_inicio: {
    type: DataTypes.DATE
  },
  fecha_fin: {
    type: DataTypes.DATE
  },
  fecha_programada: {
    type: DataTypes.DATE
  },
  hora_estimada_inicio: {
    type: DataTypes.TIME
  },
  hora_estimada_fin: {
    type: DataTypes.TIME
  },
  tareas_designadas: {
    type: DataTypes.STRING(500)
  },
  estado: {
    type: DataTypes.STRING(50),
    defaultValue: 'pendiente'
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  descripcion: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'Mantenimientos',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Mantenimiento;
