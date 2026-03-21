const { Informe } = require('../models');

const createInforme = async (data) => {
  return await Informe.create(data);
};

const getInformes = async (filters = {}, pagination = {}) => {
  const where = {};
  if (filters.tipo_informe) where.tipo_informe = filters.tipo_informe;
  if (filters.cliente_id) where.cliente_id = filters.cliente_id;
  if (filters.trabajador_id) where.trabajador_id = filters.trabajador_id;
  
  // Soporte a rango de fechas
  if (filters.fecha_inicio || filters.fecha_fin) {
    const { Op } = require('sequelize');
    where.fecha_informe = {};
    if (filters.fecha_inicio) where.fecha_informe[Op.gte] = new Date(filters.fecha_inicio);
    if (filters.fecha_fin) where.fecha_informe[Op.lte] = new Date(filters.fecha_fin);
  }

  // Búsqueda por descripción o ID
  if (filters.search) {
     const { Op } = require('sequelize');
     where[Op.or] = [
       { descripcion_trabajo: { [Op.iLike]: `%${filters.search}%` } }
     ];
     // Si es numérico, buscar por ID
     if (!isNaN(filters.search)) {
         where[Op.or].push({ informe_id: parseInt(filters.search, 10) });
     }
  }

  const queryOptions = {
    where,
    include: ['Cliente', 'Trabajador'],
    order: [['fecha_informe', 'DESC']]
  };

  if (pagination.limit) {
    queryOptions.limit = pagination.limit;
    if (pagination.offset !== undefined) queryOptions.offset = pagination.offset;
  }

  const result = await Informe.findAndCountAll(queryOptions);
  
  // Agregar conteos globales para las tarjetas del frontend basados en los filtros actuales
  const statsMantenimiento = await Informe.count({ where: { ...where, tipo_informe: 'Mantenimiento' } });
  const statsTecnico = await Informe.count({ where: { ...where, tipo_informe: 'Técnico' } });

  return { ...result, statsMantenimiento, statsTecnico };
};

const getInformeById = async (id) => {
  const informe = await Informe.findByPk(id, {
    include: ['Cliente', 'Trabajador']
  });
  if (!informe) throw new Error('INFORME_NOT_FOUND');
  return informe;
};

const updateInforme = async (id, data) => {
  const informe = await Informe.findByPk(id);
  if (!informe) throw new Error('INFORME_NOT_FOUND');
  await informe.update(data);
  return informe;
};

const deleteInforme = async (id) => {
  const informe = await Informe.findByPk(id);
  if (!informe) throw new Error('INFORME_NOT_FOUND');
  // Hard delete or update status based on requirements
  await informe.destroy(); 
  return true;
};

module.exports = {
  createInforme,
  getInformes,
  getInformeById,
  updateInforme,
  deleteInforme
};
