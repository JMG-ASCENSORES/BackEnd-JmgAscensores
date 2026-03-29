const { Ascensor, Cliente } = require('../models');
const { Op } = require('sequelize');

/**
 * Create a new ascensor
 */
const createAscensor = async (data) => {
  // Verify client exists
  const client = await Cliente.findByPk(data.cliente_id);
  if (!client) throw new Error('CLIENT_NOT_FOUND');

  // Check unique serial number
  if (data.numero_serie) {
    const exists = await Ascensor.findOne({ where: { numero_serie: data.numero_serie } });
    if (exists) throw new Error('SERIAL_NUMBER_EXISTS');
  }

  return await Ascensor.create(data);
};

/**
 * Get all ascensores (with optional client filter)
 */
const getAscensores = async (filters = {}) => {
  const where = {};
  if (filters.cliente_id) where.cliente_id = filters.cliente_id;
  if (filters.estado) where.estado = filters.estado;

  return await Ascensor.findAll({
    where,
    include: [{
      model: Cliente,
      attributes: ['cliente_id', 'tipo_cliente', 'ubicacion', 'nombre_comercial', 'contacto_nombre', 'contacto_apellido']
    }],
    order: [['fecha_creacion', 'DESC']]
  });
};

/**
 * Get ascensores paginated and/or searched
 */
const getAscensoresPaginated = async ({ page, limit, search, cliente_id, tipo_equipo, estado }) => {
  const offset = (page - 1) * limit;
  const whereClause = {};

  if (cliente_id) whereClause.cliente_id = cliente_id;
  if (tipo_equipo) whereClause.tipo_equipo = tipo_equipo;
  if (estado) whereClause.estado = estado;

  if (search) {
    const searchCondition = { [Op.iLike]: `%${search}%` };
    whereClause[Op.or] = [
      { numero_serie: searchCondition },
      { marca: searchCondition },
      { modelo: searchCondition }
    ];
  }

  return await Ascensor.findAndCountAll({
    where: whereClause,
    limit,
    offset,
    include: [{
      model: Cliente,
      attributes: ['cliente_id', 'tipo_cliente', 'ubicacion', 'nombre_comercial', 'contacto_nombre', 'contacto_apellido']
    }],
    order: [['fecha_creacion', 'DESC']]
  });
};

/**
 * Get ascensor by ID
 */
const getAscensorById = async (id) => {
  const ascensor = await Ascensor.findByPk(id, {
    include: [{
      model: Cliente,
      attributes: ['cliente_id', 'tipo_cliente', 'ubicacion', 'telefono']
    }]
  });
  if (!ascensor) throw new Error('ASCENSOR_NOT_FOUND');
  return ascensor;
};

/**
 * Update ascensor
 */
const updateAscensor = async (id, data) => {
  const ascensor = await Ascensor.findByPk(id);
  if (!ascensor) throw new Error('ASCENSOR_NOT_FOUND');

  // Check unique serial number if changing
  if (data.numero_serie && data.numero_serie !== ascensor.numero_serie) {
    const exists = await Ascensor.findOne({ where: { numero_serie: data.numero_serie } });
    if (exists) throw new Error('SERIAL_NUMBER_EXISTS');
  }

  await ascensor.update(data);
  return ascensor;
};

/**
 * Delete ascensor
 */
const deleteAscensor = async (id) => {
  const ascensor = await Ascensor.findByPk(id);
  if (!ascensor) throw new Error('ASCENSOR_NOT_FOUND');

  await ascensor.destroy();
  return true;
};

module.exports = {
  createAscensor,
  getAscensores,
  getAscensoresPaginated,
  getAscensorById,
  updateAscensor,
  deleteAscensor
};
