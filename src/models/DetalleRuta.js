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
  mantenimiento_id: {
    type: DataTypes.INTEGER
  },
  orden_parada: {
    type: DataTypes.INTEGER
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ascensor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  hora_llegada_estimada: {
    type: DataTypes.TIME
  },
  hora_llegada_real: {
    type: DataTypes.TIME
  },
  hora_fin_estimada: {
    type: DataTypes.TIME
  },
  hora_fin_real: {
    type: DataTypes.TIME
  },
  ubicacion_gps_llegada: {
    type: DataTypes.STRING(100)
  },
  ubicacion_gps_salida: {
    type: DataTypes.STRING(100)
  },
  estado_parada: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['pendiente', 'en_proceso', 'completada', 'cancelada']]
    }
  },
  observaciones: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'DetalleRuta',
  timestamps: false
});

module.exports = DetalleRuta;
