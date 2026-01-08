const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Sesion = sequelize.define('Sesion', {
  sesion_id: {
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
  token_jwt: {
    type: DataTypes.TEXT
  },
  ip_address: {
    type: DataTypes.STRING(50)
  },
  navegador: {
    type: DataTypes.STRING(255)
  },
  dispositivo: {
    type: DataTypes.STRING(100)
  },
  fecha_inicio: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  fecha_fin: {
    type: DataTypes.DATE
  },
  estado_sesion: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['activa', 'cerrada', 'expirada']]
    }
  }
}, {
  tableName: 'Sesiones',
  timestamps: false
});

module.exports = Sesion;
