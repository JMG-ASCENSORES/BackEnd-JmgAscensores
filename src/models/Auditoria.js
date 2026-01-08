const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Auditoria = sequelize.define('Auditoria', {
  auditoria_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  admin_id: {
    type: DataTypes.INTEGER
  },
  trabajador_id: {
    type: DataTypes.INTEGER
  },
  tabla_afectada: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  operacion: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['INSERT', 'UPDATE', 'DELETE']]
    }
  },
  registro_id: {
    type: DataTypes.INTEGER
  },
  valores_anteriores: {
    type: DataTypes.TEXT
  },
  valores_nuevos: {
    type: DataTypes.TEXT
  },
  ip_address: {
    type: DataTypes.STRING(50)
  },
  navegador: {
    type: DataTypes.STRING(255)
  },
  fecha_operacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Auditoria',
  timestamps: false
});

module.exports = Auditoria;
