const { Mantenimiento, Cliente, Ascensor } = require('../models');
const { Op } = require('sequelize');

/**
 * Create a new maintenance
 */
const createMantenimiento = async (data) => {
  // Verify client and ascensor exist
  const client = await Cliente.findByPk(data.cliente_id);
  if (!client) throw new Error('CLIENT_NOT_FOUND');

  const ascensor = await Ascensor.findByPk(data.ascensor_id);
  if (!ascensor) throw new Error('ASCENSOR_NOT_FOUND');

  // Validate ascensor belongs to client
  if (ascensor.cliente_id !== data.cliente_id) {
    throw new Error('ASCENSOR_BELONGS_TO_OTHER_CLIENT');
  }

  return await Mantenimiento.create(data);
};

/**
 * Get all maintenances (with optional filters)
 */
const getMantenimientos = async (filters = {}) => {
  const where = {};
  if (filters.cliente_id) where.cliente_id = filters.cliente_id;
  if (filters.ascensor_id) where.ascensor_id = filters.ascensor_id;
  if (filters.estado) where.estado = filters.estado;
  if (filters.fecha) {
    const start = new Date(filters.fecha);
    start.setHours(0,0,0,0);
    const end = new Date(filters.fecha);
    end.setHours(23,59,59,999);
    where.fecha_programada = {
      [Op.between]: [start, end]
    };
  }

  return await Mantenimiento.findAll({
    where,
    include: [
      {
        model: Cliente,
        attributes: ['cliente_id', 'codigo', 'ubicacion']
      },
      {
        model: Ascensor,
        attributes: ['ascensor_id', 'numero_serie', 'marca', 'modelo']
      }
    ],
    order: [['fecha_programada', 'ASC']]
  });
};

/**
 * Get maintenance by ID
 */
const getMantenimientoById = async (id) => {
  const mantenimiento = await Mantenimiento.findByPk(id, {
    include: [
      {
        model: Cliente,
        attributes: ['cliente_id', 'codigo', 'ubicacion', 'telefono']
      },
      {
        model: Ascensor,
        attributes: ['ascensor_id', 'numero_serie', 'marca', 'modelo', 'tipo_equipo']
      }
    ]
  });
  if (!mantenimiento) throw new Error('MANTENIMIENTO_NOT_FOUND');
  return mantenimiento;
};

/**
 * Update maintenance
 */
const updateMantenimiento = async (id, data) => {
  const mantenimiento = await Mantenimiento.findByPk(id);
  if (!mantenimiento) throw new Error('MANTENIMIENTO_NOT_FOUND');
  
  await mantenimiento.update(data);
  return mantenimiento;
};

/**
 * Delete maintenance
 */
const deleteMantenimiento = async (id) => {
  const mantenimiento = await Mantenimiento.findByPk(id);
  if (!mantenimiento) throw new Error('MANTENIMIENTO_NOT_FOUND');

  await mantenimiento.destroy();
  return true;
};

module.exports = {
  createMantenimiento,
  getMantenimientos,
  getMantenimientoById,
  updateMantenimiento,
  deleteMantenimiento
};
