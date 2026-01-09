const informesService = require('../services/informes.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createInforme = async (req, res, next) => {
  try {
    const informe = await informesService.createInforme(req.body);
    res.status(201).json(successResponse(informe, 'Informe creado exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getInformes = async (req, res, next) => {
  try {
    const informes = await informesService.getInformes();
    res.status(200).json(successResponse(informes, 'Lista de informes'));
  } catch (error) {
    next(error);
  }
};

const getInformeById = async (req, res, next) => {
  try {
    const informe = await informesService.getInformeById(req.params.id);
    res.status(200).json(successResponse(informe, 'Detalle del informe'));
  } catch (error) {
    if (error.message === 'INFORME_NOT_FOUND') {
      return res.status(404).json(errorResponse('Informe no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateInforme = async (req, res, next) => {
  try {
    const informe = await informesService.updateInforme(req.params.id, req.body);
    res.status(200).json(successResponse(informe, 'Informe actualizado exitosamente'));
  } catch (error) {
    if (error.message === 'INFORME_NOT_FOUND') {
      return res.status(404).json(errorResponse('Informe no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteInforme = async (req, res, next) => {
  try {
    await informesService.deleteInforme(req.params.id);
    res.status(200).json(successResponse(null, 'Informe eliminado exitosamente'));
  } catch (error) {
    if (error.message === 'INFORME_NOT_FOUND') {
      return res.status(404).json(errorResponse('Informe no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createInforme,
  getInformes,
  getInformeById,
  updateInforme,
  deleteInforme
};
