const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Trabajador = sequelize.define('Trabajador', {
  trabajador_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  dni: {
    type: DataTypes.STRING(8),
    allowNull: false,
    unique: true
  },
  codigo: {
    type: DataTypes.STRING(20),
    unique: true
  },
  nombre: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  apellido: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  edad: {
    type: DataTypes.INTEGER
  },
  correo: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  telefono: {
    type: DataTypes.STRING(20)
  },
  contrasena_hash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fecha_contrato: {
    type: DataTypes.DATEONLY
  },
  especialidad: {
    type: DataTypes.STRING(100)
  },
  foto_perfil: {
    type: DataTypes.STRING(255)
  },
  estado_activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'Trabajadores',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Trabajador;
