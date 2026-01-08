const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Tarea = sequelize.define('Tarea', {
  tarea_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  mantenimiento_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  nombre_tarea: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  descripcion_tarea: {
    type: DataTypes.TEXT
  },
  ubicacion: {
    type: DataTypes.STRING(300)
  },
  tipo_tarea: {
    type: DataTypes.STRING(100)
  },
  estado: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['pendiente', 'en_proceso', 'completada', 'cancelada']]
    }
  }
}, {
  tableName: 'Tareas',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: false
});

module.exports = Tarea;
