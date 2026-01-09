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
  }
}, {
  tableName: 'Sesiones',
  timestamps: false
});

module.exports = Sesion;
