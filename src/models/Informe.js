const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Informe = sequelize.define('Informe', {
  informe_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  asignacion_id: {
    type: DataTypes.INTEGER
  },
  trabajador_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  ascensor_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo_informe: {
    type: DataTypes.STRING(50)
  },
  descripcion_trabajo: {
    type: DataTypes.TEXT
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  ubicacion_envio: {
    type: DataTypes.STRING(100)
  },
  fecha_informe: {
    type: DataTypes.DATE
  },
  hora_informe: {
    type: DataTypes.TIME
  },
  firma_tecnico: {
    type: DataTypes.TEXT
  },
  firma_cliente: {
    type: DataTypes.TEXT
  },
  url_documento: {
    type: DataTypes.STRING(255)
  }
}, {
  tableName: 'Informes',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Informe;
