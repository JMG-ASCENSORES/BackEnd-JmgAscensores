const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Mantenimiento = sequelize.define('Mantenimiento', {
  mantenimiento_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ascensor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo_mantenimiento: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['preventivo', 'correctivo', 'inspeccion']]
    }
  },
  fecha_programada: {
    type: DataTypes.DATE,
    allowNull: false
  },
  fecha_inicio: {
    type: DataTypes.DATE
  },
  fecha_finalizacion: {
    type: DataTypes.DATE
  },
  hora_estimada_inicio: {
    type: DataTypes.TIME
  },
  hora_estimada_fin: {
    type: DataTypes.TIME
  },
  descripcion_trabajo: {
    type: DataTypes.TEXT
  },
  tareas_designadas: {
    type: DataTypes.STRING(500)
  },
  estado: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['pendiente', 'en_proceso', 'completado', 'cancelado', 'reprogramado']]
    }
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  prioridad: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['baja', 'media', 'alta', 'urgente']]
    }
  },
  codigo_mantenimiento: {
    type: DataTypes.STRING(50),
    unique: true
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'Mantenimientos',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Mantenimiento;
