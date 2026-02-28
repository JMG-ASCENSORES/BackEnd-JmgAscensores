const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Programacion = sequelize.define('Programacion', {
  programacion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  titulo: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  fecha_inicio: {
    type: DataTypes.DATE, // Includes time
    allowNull: false
  },
  fecha_fin: {
    type: DataTypes.DATE, // Includes time
    allowNull: false
  },
  // Técnico 1 (principal — legacy field)
  trabajador_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Trabajadores', key: 'trabajador_id' }
  },
  // Técnico 2
  tecnico2_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Trabajadores', key: 'trabajador_id' }
  },
  // Técnico 3
  tecnico3_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Trabajadores', key: 'trabajador_id' }
  },
  // Técnico 4
  tecnico4_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'Trabajadores', key: 'trabajador_id' }
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Clientes',
      key: 'cliente_id'
    }
  },
  ascensor_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Ascensores',
      key: 'ascensor_id'
    }
  },
  tipo_trabajo: {
    type: DataTypes.STRING(50),
    defaultValue: 'mantenimiento',
    validate: {
      isIn: [['mantenimiento', 'reparacion', 'inspeccion', 'emergencia']]
    }
  },
  estado: {
    type: DataTypes.STRING(50),
    defaultValue: 'pendiente', // pendiente, completado, cancelado
    validate: {
      isIn: [['pendiente', 'completado', 'cancelado', 'en_progreso']]
    }
  },
  color: {
    type: DataTypes.STRING(20),
    defaultValue: '#3788d8' // Default FullCalendar blue
  },
  descripcion: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'Programaciones',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Programacion;
