const evidenciasService = require('../services/evidencias.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createEvidencia = async (req, res, next) => {
  try {
    const evidencia = await evidenciasService.createEvidencia(req.body);
    res.status(201).json(successResponse(evidencia, 'Evidencia registrada exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getEvidencias = async (req, res, next) => {
  try {
    const evidencias = await evidenciasService.getEvidencias();
    res.status(200).json(successResponse(evidencias, 'Lista de evidencias'));
  } catch (error) {
    next(error);
  }
};

const getEvidenciaById = async (req, res, next) => {
  try {
    const evidencia = await evidenciasService.getEvidenciaById(req.params.id);
    res.status(200).json(successResponse(evidencia, 'Detalle de evidencia'));
  } catch (error) {
    if (error.message === 'EVIDENCIA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Evidencia no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateEvidencia = async (req, res, next) => {
  try {
    const evidencia = await evidenciasService.updateEvidencia(req.params.id, req.body);
    res.status(200).json(successResponse(evidencia, 'Evidencia actualizada'));
  } catch (error) {
    if (error.message === 'EVIDENCIA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Evidencia no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteEvidencia = async (req, res, next) => {
  try {
    await evidenciasService.deleteEvidencia(req.params.id);
    res.status(200).json(successResponse(null, 'Evidencia eliminada'));
  } catch (error) {
    if (error.message === 'EVIDENCIA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Evidencia no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createEvidencia,
  getEvidencias,
  getEvidenciaById,
  updateEvidencia,
  deleteEvidencia
};
