const { Cliente, Ascensor } = require('../models');
const { generateClientCode } = require('../utils/codeGenerator.util');
const { hashPassword } = require('../utils/password.util');
const { Op } = require('sequelize');

/**
 * Create a new client
 */
const createClient = async (data) => {
  if (data.contra) {
    data.contra = await hashPassword(data.contra);
  }

  // Check if DNI exists
  const exists = await Cliente.findOne({ where: { dni: data.dni } });
  if (exists) {
    throw new Error('CLIENT_ALREADY_EXISTS'); 
  }

  const client = await Cliente.create(data);

  return client;
};

/**
 * Get all clients
 */
const getClients = async () => {
  return await Cliente.findAll({
    where: { estado_activo: true },
    order: [['fecha_creacion', 'DESC']]
  });
};

/**
 * Get client by ID
 */
const getClientById = async (id) => {
  const client = await Cliente.findByPk(id);
  if (!client) throw new Error('CLIENT_NOT_FOUND');
  return client;
};

/**
 * Update client
 */
const updateClient = async (id, data) => {
  const client = await Cliente.findByPk(id);
  if (!client) throw new Error('CLIENT_NOT_FOUND');
  
  await client.update(data);
  return client;
};

/**
 * Delete client (soft)
 */
const deleteClient = async (id) => {
  const client = await Cliente.findByPk(id);
  if (!client) throw new Error('CLIENT_NOT_FOUND');

  await client.update({ estado_activo: false });
  return true;
};

/**
 * Get ascensors for client
 */
const getClientAscensores = async (id) => {
  const client = await Cliente.findByPk(id);
  if (!client) throw new Error('CLIENT_NOT_FOUND');

  return await Ascensor.findAll({
    where: { cliente_id: id }
  });
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getClientAscensores
};
