const { Cliente, Ascensor } = require('../models');
const { generateClientCode } = require('../utils/codeGenerator.util');
const { hashPassword } = require('../utils/password.util');
const { Op } = require('sequelize');

/**
 * Create a new client
 */
const createClient = async (data) => {
  // Generate code
  let codigo = generateClientCode();
  let codeExists = await Cliente.findOne({ where: { codigo } });
  while (codeExists) {
    codigo = generateClientCode();
    codeExists = await Cliente.findOne({ where: { codigo } });
  }

  if (data.contra) {
    data.contra = await hashPassword(data.contra);
  }

  const client = await Cliente.create({
    ...data,
    codigo
  });

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
