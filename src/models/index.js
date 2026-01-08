const { sequelize } = require('../config/database');

const Administrador = require('./Administrador');
const Trabajador = require('./Trabajador');
const Cliente = require('./Cliente');
const Ascensor = require('./Ascensor');
const Mantenimiento = require('./Mantenimiento');

// Associations

// Clientes <-> Ascensores
Cliente.hasMany(Ascensor, { foreignKey: 'cliente_id' });
Ascensor.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// Clientes <-> Mantenimientos
Cliente.hasMany(Mantenimiento, { foreignKey: 'cliente_id' });
Mantenimiento.belongsTo(Cliente, { foreignKey: 'cliente_id' });

// Ascensores <-> Mantenimientos
Ascensor.hasMany(Mantenimiento, { foreignKey: 'ascensor_id' });
Mantenimiento.belongsTo(Ascensor, { foreignKey: 'ascensor_id' });

module.exports = {
  sequelize,
  Administrador,
  Trabajador,
  Cliente,
  Ascensor,
  Mantenimiento
};
