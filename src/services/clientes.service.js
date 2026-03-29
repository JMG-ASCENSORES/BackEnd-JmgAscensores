const { Cliente, Ascensor, sequelize } = require('../models');
const { generateClientCode } = require('../utils/codeGenerator.util');
const { hashPassword } = require('../utils/password.util');
const { Op } = require('sequelize');

/**
 * Common attributes for client lists, including equipment counts
 */
const getClientListAttributes = () => {
  return {
    include: [
      [
        sequelize.literal(`(
          SELECT COUNT(*)
          FROM "Ascensores" AS "A"
          WHERE "A"."cliente_id" = "Cliente"."cliente_id"
          AND LOWER("A"."tipo_equipo") LIKE '%ascensor%'
        )`),
        'ascensores_count'
      ],
      [
        sequelize.literal(`(
          SELECT COUNT(*)
          FROM "Ascensores" AS "A"
          WHERE "A"."cliente_id" = "Cliente"."cliente_id"
          AND LOWER("A"."tipo_equipo") LIKE '%montacarga%'
        )`),
        'montacargas_count'
      ],
      [
        sequelize.literal(`(
          SELECT COUNT(*)
          FROM "Ascensores" AS "A"
          WHERE "A"."cliente_id" = "Cliente"."cliente_id"
          AND LOWER("A"."tipo_equipo") LIKE '%plataforma%'
        )`),
        'plataforma_count'
      ]
    ]
  };
};

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
 * Get all clients (Legacy list)
 */
const getClients = async (data = {}) => {
  const { activeFilter, tipo_cliente } = data;
  const where = {};
  
  if (activeFilter !== undefined) {
     where.estado_activo = activeFilter;
  } else {
     where.estado_activo = true; 
  }

  if (tipo_cliente) {
    where.tipo_cliente = tipo_cliente;
  }
  
  return await Cliente.findAll({
    where,
    attributes: getClientListAttributes(),
    order: [['fecha_creacion', 'DESC']]
  });
};

/**
 * Get clients paginated and/or searched
 */
const getClientsPaginated = async ({ page, limit, search, tipo_cliente }) => {
  const offset = (page - 1) * limit;
  const whereClause = { estado_activo: true };

  if (tipo_cliente) {
    whereClause.tipo_cliente = tipo_cliente;
  }

  if (search) {
    const searchCondition = { [Op.iLike]: `%${search}%` };
    whereClause[Op.or] = [
      { contacto_nombre: searchCondition },
      { contacto_apellido: searchCondition },
      { nombre_comercial: searchCondition },
      { ruc: searchCondition },
      { dni: searchCondition }
    ];
  }

  return await Cliente.findAndCountAll({
    where: whereClause,
    attributes: getClientListAttributes(),
    limit,
    offset,
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

/**
 * Get global stats for the clients dashboard (called once)
 */
const getClientStats = async () => {
  const [results] = await sequelize.query(`
    SELECT 
      (SELECT COUNT(*) FROM "Clientes" WHERE "estado_activo" = true) AS total_clientes,
      (SELECT COUNT(*) FROM "Ascensores" AS "A" 
       INNER JOIN "Clientes" AS "C" ON "A"."cliente_id" = "C"."cliente_id"
       WHERE "C"."estado_activo" = true AND LOWER("A"."tipo_equipo") LIKE '%ascensor%') AS total_ascensores,
      (SELECT COUNT(*) FROM "Ascensores" AS "A" 
       INNER JOIN "Clientes" AS "C" ON "A"."cliente_id" = "C"."cliente_id"
       WHERE "C"."estado_activo" = true AND LOWER("A"."tipo_equipo") LIKE '%montacarga%') AS total_montacargas,
      (SELECT COUNT(*) FROM "Ascensores" AS "A" 
       INNER JOIN "Clientes" AS "C" ON "A"."cliente_id" = "C"."cliente_id"
       WHERE "C"."estado_activo" = true AND LOWER("A"."tipo_equipo") LIKE '%plataforma%') AS total_plataformas
  `);
  
  const stats = results[0];
  return {
    total_clientes: Number(stats.total_clientes),
    total_ascensores: Number(stats.total_ascensores),
    total_montacargas: Number(stats.total_montacargas),
    total_plataformas: Number(stats.total_plataformas)
  };
};

module.exports = {
  createClient,
  getClients,
  getClientsPaginated,
  getClientById,
  updateClient,
  deleteClient,
  getClientAscensores,
  getClientStats
};
