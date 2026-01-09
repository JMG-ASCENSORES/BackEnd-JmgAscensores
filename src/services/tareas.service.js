const { Tarea } = require('../models');

const createTarea = async (data) => {
  return await Tarea.create(data);
};

const getTareas = async () => {
  return await Tarea.findAll({
    where: { activo: true },
    order: [['fecha_creacion', 'DESC']]
  });
};

const getTareaById = async (id) => {
  const tarea = await Tarea.findByPk(id);
  if (!tarea) throw new Error('TAREA_NOT_FOUND');
  return tarea;
};

const updateTarea = async (id, data) => {
  const tarea = await Tarea.findByPk(id);
  if (!tarea) throw new Error('TAREA_NOT_FOUND');
  await tarea.update(data);
  return tarea;
};

const deleteTarea = async (id) => {
  const tarea = await Tarea.findByPk(id);
  if (!tarea) throw new Error('TAREA_NOT_FOUND');
  await tarea.update({ activo: false });
  return true;
};

module.exports = {
  createTarea,
  getTareas,
  getTareaById,
  updateTarea,
  deleteTarea
};
