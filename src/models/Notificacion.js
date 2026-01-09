const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Notificacion = sequelize.define('Notificacion', {
  notificacion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  trabajador_id: {
    type: DataTypes.INTEGER
  },
  cliente_id: {
    type: DataTypes.INTEGER
  },
  tipo_notificacion: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  titulo: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  mensaje: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  canal_envio: {
    type: DataTypes.STRING(50)
  },
  numero_telefono: {
    type: DataTypes.STRING(20)
  },
  correo_destino: {
    type: DataTypes.STRING(100)
  }
}, {
  tableName: 'Notificaciones',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: false
});

module.exports = Notificacion;
