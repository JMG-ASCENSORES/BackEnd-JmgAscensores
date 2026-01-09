const { RutaDiaria } = require('../models');

const createRuta = async (data) => {
  return await RutaDiaria.create(data);
};

const getRutas = async () => {
  return await RutaDiaria.findAll({
    include: ['Trabajador'], // Assuming association
    order: [['fecha_ruta', 'DESC']]
  });
};

const getRutaById = async (id) => {
  const ruta = await RutaDiaria.findByPk(id);
  if (!ruta) throw new Error('RUTA_NOT_FOUND');
  return ruta;
};

const updateRuta = async (id, data) => {
  const ruta = await RutaDiaria.findByPk(id);
  if (!ruta) throw new Error('RUTA_NOT_FOUND');
  await ruta.update(data);
  return ruta;
};

const deleteRuta = async (id) => {
  const ruta = await RutaDiaria.findByPk(id);
  if (!ruta) throw new Error('RUTA_NOT_FOUND');
  await ruta.destroy();
  return true;
};

module.exports = {
  createRuta,
  getRutas,
  getRutaById,
  updateRuta,
  deleteRuta
};
