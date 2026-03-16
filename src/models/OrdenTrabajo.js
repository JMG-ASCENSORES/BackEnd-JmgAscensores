const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const OrdenTrabajo = sequelize.define('OrdenTrabajo', {
  orden_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  programacion_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ascensor_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  hora_inicio: {
    type: DataTypes.TIME
  },
  hora_fin: {
    type: DataTypes.TIME
  },
  estado: {
    type: DataTypes.STRING(50),
    defaultValue: 'en_progreso',
    validate: {
      isIn: [['en_progreso', 'completado', 'cancelado']]
    }
  },
  observaciones_generales: {
    type: DataTypes.TEXT,
    comment: 'Observaciones del técnico sobre todo el trabajo'
  }
}, {
  tableName: 'OrdenesTrabajo',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = OrdenTrabajo;
