const { Evidencia } = require('../models');

const createEvidencia = async (data) => {
  return await Evidencia.create(data);
};

const getEvidencias = async () => {
  return await Evidencia.findAll({
    limit: 100,
    order: [['fecha_registro', 'DESC']]
  });
};

const getEvidenciaById = async (id) => {
  const evidencia = await Evidencia.findByPk(id);
  if (!evidencia) throw new Error('EVIDENCIA_NOT_FOUND');
  return evidencia;
};

const updateEvidencia = async (id, data) => {
  const evidencia = await Evidencia.findByPk(id);
  if (!evidencia) throw new Error('EVIDENCIA_NOT_FOUND');
  await evidencia.update(data);
  return evidencia;
};

const deleteEvidencia = async (id) => {
  const evidencia = await Evidencia.findByPk(id);
  if (!evidencia) throw new Error('EVIDENCIA_NOT_FOUND');
  await evidencia.destroy();
  return true;
};

module.exports = {
  createEvidencia,
  getEvidencias,
  getEvidenciaById,
  updateEvidencia,
  deleteEvidencia
};
