const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TareaMaestra = sequelize.define('TareaMaestra', {
  tarea_maestra_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipo_equipo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    comment: 'Ej: Ascensor, Plataforma, Montacargas, Todos'
  },
  descripcion_tarea: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  categoria: {
    type: DataTypes.STRING(100),
    comment: 'Ej: Cabina, Foso, Sala de Máquinas, General'
  },
  activa: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'TareasMaestras',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = TareaMaestra;
