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
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['whatsapp', 'email', 'sms', 'notificacion_app']]
    }
  },
  numero_telefono: {
    type: DataTypes.STRING(20)
  },
  correo_destino: {
    type: DataTypes.STRING(100)
  },
  leida: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  fecha_lectura: {
    type: DataTypes.DATE
  },
  fecha_envio: {
    type: DataTypes.DATE
  },
  estado_envio: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['pendiente', 'enviado', 'fallido', 'entregado']]
    }
  },
  intento_envio: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  motivo_fallo: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'Notificaciones',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: false
});

module.exports = Notificacion;
