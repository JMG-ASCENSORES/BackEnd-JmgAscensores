const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Configuracion = sequelize.define('Configuracion', {
  config_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clave: {
    type: DataTypes.STRING(100),
    unique: true,
    allowNull: false
  },
  valor: {
    type: DataTypes.TEXT
  },
  descripcion: {
    type: DataTypes.STRING(255)
  },
  tipo_dato: {
    type: DataTypes.STRING(50)
  },
  fecha_actualizacion: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Configuracion',
  timestamps: false
});

module.exports = Configuracion;
