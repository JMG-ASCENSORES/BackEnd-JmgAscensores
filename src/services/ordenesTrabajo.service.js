const { OrdenTrabajo, DetalleOrden, Programacion, Cliente, Ascensor, TareaMaestra } = require('../models');

const createOrdenTrabajo = async (data) => {
  const { detalles, ...ordenData } = data; // detalles: array of { tarea_maestra_id, realizado, accion_realizada }
  
  const orden = await OrdenTrabajo.create(ordenData);

  if (detalles && detalles.length > 0) {
    const detallesData = detalles.map(d => ({
      ...d,
      orden_id: orden.orden_id
    }));
    await DetalleOrden.bulkCreate(detallesData);
  }

  return await getOrdenTrabajoById(orden.orden_id);
};

const getOrdenesTrabajo = async (query = {}) => {
  return await OrdenTrabajo.findAll({
    where: query,
    include: [
      { model: Programacion },
      { model: Cliente },
      { model: Ascensor },
      { model: DetalleOrden, include: [TareaMaestra] }
    ],
    order: [['fecha_creacion', 'DESC']]
  });
};

const getOrdenTrabajoById = async (id) => {
  const orden = await OrdenTrabajo.findByPk(id, {
    include: [
      { model: Programacion },
      { model: Cliente },
      { model: Ascensor },
      { model: DetalleOrden, include: [TareaMaestra] }
    ]
  });
  if (!orden) throw new Error('ORDEN_NOT_FOUND');
  return orden;
};

const updateOrdenTrabajo = async (id, data) => {
  const orden = await OrdenTrabajo.findByPk(id);
  if (!orden) throw new Error('ORDEN_NOT_FOUND');
  
  const { detalles, ...ordenData } = data;
  await orden.update(ordenData);

  if (detalles) {
    // Basic approach: delete old details and recreate
    await DetalleOrden.destroy({ where: { orden_id: id } });
    if (detalles.length > 0) {
      const detallesData = detalles.map(d => ({
        ...d,
        orden_id: id
      }));
      await DetalleOrden.bulkCreate(detallesData);
    }
  }

  return await getOrdenTrabajoById(id);
};

const deleteOrdenTrabajo = async (id) => {
  const orden = await OrdenTrabajo.findByPk(id);
  if (!orden) throw new Error('ORDEN_NOT_FOUND');
  // First delete details
  await DetalleOrden.destroy({ where: { orden_id: id } });
  await orden.destroy();
  return true;
};

module.exports = {
  createOrdenTrabajo,
  getOrdenesTrabajo,
  getOrdenTrabajoById,
  updateOrdenTrabajo,
  deleteOrdenTrabajo
};
