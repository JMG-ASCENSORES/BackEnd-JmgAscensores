const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const DetalleRuta = sequelize.define('DetalleRuta', {
  detalle_ruta_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ruta_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  hora_llegada: {
    type: DataTypes.TIME
  },
  hora_salida: {
    type: DataTypes.TIME
  },
  ubicacion_gps_llegada: {
    type: DataTypes.STRING(100)
  },
  ubicacion_gps_salida: {
    type: DataTypes.STRING(100)
  }
}, {
  tableName: 'DetalleRuta',
  timestamps: false
});

module.exports = DetalleRuta;
