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
  tipo_tarea: {
    type: DataTypes.STRING(100)
  },
  estado: {
    type: DataTypes.STRING(50)
  }
}, {
  tableName: 'Tareas',
  timestamps: false
});

module.exports = Tarea;
