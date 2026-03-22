const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Informe = sequelize.define('Informe', {
  informe_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  orden_id: {
    type: DataTypes.INTEGER,
    comment: 'Referencia a la Orden de Trabajo (Mantenimiento/Reparación)'
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
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: {
      notEmpty: true,
      isIn: [['Técnico', 'Mantenimiento']]
    },
    comment: 'Ej: preventivo, correctivo/reparacion'
  },
  descripcion_trabajo: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: 'Resumen del trabajo realizado'
  },
  observaciones: {
    type: DataTypes.TEXT
  },
  ubicacion_envio: {
    type: DataTypes.STRING(100)
  },
  fecha_informe: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    validate: {
      isDate: true
    },
    get() {
      const rawValue = this.getDataValue('fecha_informe');
      if (!rawValue) return rawValue;
      if (typeof rawValue === 'string') return rawValue.split('T')[0];
      
      // Si Sequelize carga un objeto Date, SIEMPRE extraer la parte ISO UTC
      // para evitar que la zona horaria local (Peru UTC-5) reste un día a medianoche.
      if (rawValue instanceof Date) {
        return rawValue.toISOString().split('T')[0];
      }
      return rawValue;
    },
    set(val) {
      if (!val) {
        this.setDataValue('fecha_informe', val);
        return;
      }
      // Asegurar que guardamos solo 'YYYY-MM-DD'
      if (typeof val === 'string') {
        this.setDataValue('fecha_informe', val.split('T')[0]);
      } else if (val instanceof Date) {
        this.setDataValue('fecha_informe', val.toISOString().split('T')[0]);
      } else {
        this.setDataValue('fecha_informe', val);
      }
    }
  },
  hora_informe: {
    type: DataTypes.TIME,
    allowNull: false
  },
  firma_tecnico_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  firma_cliente_id: {
    type: DataTypes.INTEGER,
    allowNull: true
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
