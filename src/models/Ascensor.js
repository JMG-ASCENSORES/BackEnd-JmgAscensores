const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Ascensor = sequelize.define('Ascensor', {
  ascensor_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo_equipo: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['ascensor', 'plataforma', 'escalera']]
    }
  },
  marca: {
    type: DataTypes.STRING(100)
  },
  modelo: {
    type: DataTypes.STRING(100)
  },
  numero_serie: {
    type: DataTypes.STRING(100),
    unique: true
  },
  capacidad: {
    type: DataTypes.STRING(100)
  },
  piso_ubicacion: {
    type: DataTypes.INTEGER
  },
  designar_ubicacion: {
    type: DataTypes.STRING(300)
  },
  numero_registro: {
    type: DataTypes.STRING(50),
    unique: true
  },
  fecha_instalacion: {
    type: DataTypes.DATEONLY
  },
  fecha_ultimo_mantenimiento: {
    type: DataTypes.DATEONLY
  },
  estado: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['activo', 'inactivo', 'mantenimiento', 'fuera_servicio']]
    }
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'Ascensores',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Ascensor;
