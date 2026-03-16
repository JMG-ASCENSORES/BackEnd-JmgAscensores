const { TareaMaestra } = require('../models');

const createTareaMaestra = async (data) => {
  return await TareaMaestra.create(data);
};

const getTareasMaestras = async (query = {}) => {
  return await TareaMaestra.findAll({ where: query });
};

const getTareaMaestraById = async (id) => {
  const tarea = await TareaMaestra.findByPk(id);
  if (!tarea) throw new Error('TAREA_MAESTRA_NOT_FOUND');
  return tarea;
};

const updateTareaMaestra = async (id, data) => {
  const tarea = await TareaMaestra.findByPk(id);
  if (!tarea) throw new Error('TAREA_MAESTRA_NOT_FOUND');
  await tarea.update(data);
  return tarea;
};

const deleteTareaMaestra = async (id) => {
  const tarea = await TareaMaestra.findByPk(id);
  if (!tarea) throw new Error('TAREA_MAESTRA_NOT_FOUND');
  // Alternatively, soft delete: await tarea.update({ activa: false });
  await tarea.update({ activa: false });
  return true;
};

module.exports = {
  createTareaMaestra,
  getTareasMaestras,
  getTareaMaestraById,
  updateTareaMaestra,
  deleteTareaMaestra
};
