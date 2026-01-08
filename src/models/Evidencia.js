const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Evidencia = sequelize.define('Evidencia', {
  evidencia_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  informe_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  tipo_evidencia: {
    type: DataTypes.STRING(50),
    validate: {
      isIn: [['foto', 'video', 'documento']]
    }
  },
  url_archivo: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  nombre_archivo: {
    type: DataTypes.STRING(255)
  },
  descripcion: {
    type: DataTypes.STRING(300)
  },
  orden: {
    type: DataTypes.INTEGER
  },
  fecha_carga: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'Evidencias',
  timestamps: false
});

module.exports = Evidencia;
