const { Informe } = require('../models');

const createInforme = async (data) => {
  return await Informe.create(data);
};

const getInformes = async (filters = {}) => {
  const where = {};
  if (filters.tipo_informe) where.tipo_informe = filters.tipo_informe;
  if (filters.cliente_id) where.cliente_id = filters.cliente_id;
  if (filters.trabajador_id) where.trabajador_id = filters.trabajador_id;
  
  return await Informe.findAll({
    where,
    include: ['Cliente', 'Trabajador'],
    order: [['fecha_informe', 'DESC']]
  });
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
