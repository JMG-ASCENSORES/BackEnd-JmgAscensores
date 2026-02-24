const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  cliente_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tipo_cliente: {
    type: DataTypes.STRING(50)
  },
  dni: {
    type: DataTypes.STRING(20),
    unique: true,
    allowNull: false
  },
  contra: {
    type: DataTypes.STRING(100)
  },
  ruc: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  nombre_comercial: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  ubicacion: {
    type: DataTypes.STRING(300)
  },
  latitud: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  longitud: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  ciudad: {
    type: DataTypes.STRING(100)
  },
  distrito: {
    type: DataTypes.STRING(100)
  },
  telefono: {
    type: DataTypes.STRING(20)
  },
  contacto_correo: {
    type: DataTypes.STRING(100)
  },
  contacto_nombre: {
    type: DataTypes.STRING(100)
  },
  contacto_apellido: {
    type: DataTypes.STRING(100)
  },
  contacto_telefono: {
    type: DataTypes.STRING(20)
  },
  estado_activo: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'Clientes',
  timestamps: true,
  createdAt: 'fecha_creacion',
  updatedAt: 'fecha_actualizacion'
});

module.exports = Cliente;
