const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const MantenimientoFijo = sequelize.define('MantenimientoFijo', {
  mantenimiento_fijo_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ascensor_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true,
    references: {
      model: 'Ascensores',
      key: 'ascensor_id'
    }
  },
  trabajador_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Trabajadores',
      key: 'trabajador_id'
    }
  },
  dia_mes: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 31
    }
  },
  hora: {
    type: DataTypes.TIME,
    allowNull: false
  },
  frecuencia: {
    type: DataTypes.ENUM('mensual', 'bimestral', 'trimestral'),
    allowNull: false
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'MantenimientosFijos',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = MantenimientoFijo;
