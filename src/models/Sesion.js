const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sesion = sequelize.define('Sesion', {
  sesion_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  admin_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  trabajador_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  token: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  ip_address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  expira_en: {
    type: DataTypes.DATE,
    allowNull: false
  },
  fecha_creacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Sesiones',
  timestamps: false
});

module.exports = Sesion;
