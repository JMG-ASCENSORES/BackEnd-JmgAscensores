const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Asignacion = sequelize.define('Asignacion', {
  asignacion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  trabajador_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  admin_id: {
    type: DataTypes.INTEGER
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  fecha_asignacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fecha_inicio_asignacion: {
    type: DataTypes.DATE
  },
  fecha_fin_asignacion: {
    type: DataTypes.DATE
  },
  estado_asignacion: {
    type: DataTypes.STRING(50)
  }
}, {
  tableName: 'Asignaciones',
  timestamps: false // Manually handling fecha_asignacion
});

module.exports = Asignacion;
