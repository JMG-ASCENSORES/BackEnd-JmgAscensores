const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Cliente = sequelize.define('Cliente', {
  cliente_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  razon_social: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  tipo_cliente: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['empresa', 'edificio', 'otro']]
    }
  },
  codigo: {
    type: DataTypes.STRING(50),
    unique: true
  },
  contra: {
    type: DataTypes.STRING(100)
  },
  ubicacion: {
    type: DataTypes.STRING(300),
    allowNull: false
  },
  ciudad: {
    type: DataTypes.STRING(100)
  },
  provincia: {
    type: DataTypes.STRING(100)
  },
  codigo_postal: {
    type: DataTypes.STRING(10)
  },
  telefono: {
    type: DataTypes.STRING(20)
  },
  correo_contacto: {
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
  ruc_cedula: {
    type: DataTypes.STRING(20)
  },
  fecha_registro: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
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
