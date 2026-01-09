const ascensoresService = require('../services/ascensores.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createAscensor = async (req, res, next) => {
  try {
    const ascensor = await ascensoresService.createAscensor(req.body);
    res.status(201).json(successResponse(ascensor, 'Ascensor creado exitosamente'));
  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json(errorResponse('Cliente no encontrado', 'NOT_FOUND'));
    }
    if (error.message === 'SERIAL_NUMBER_EXISTS') {
      return res.status(400).json(errorResponse('El número de serie ya existe', 'DUPLICATE_ENTRY'));
    }
    next(error);
  }
};

const getAscensores = async (req, res, next) => {
  try {
    const ascensores = await ascensoresService.getAscensores(req.query);
    res.status(200).json(successResponse(ascensores, 'Ascensores obtenidos exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getAscensorById = async (req, res, next) => {
  try {
    const ascensor = await ascensoresService.getAscensorById(req.params.id);
    res.status(200).json(successResponse(ascensor, 'Ascensor obtenido exitosamente'));
  } catch (error) {
    if (error.message === 'ASCENSOR_NOT_FOUND') {
      return res.status(404).json(errorResponse('Ascensor no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateAscensor = async (req, res, next) => {
  try {
    const ascensor = await ascensoresService.updateAscensor(req.params.id, req.body);
    res.status(200).json(successResponse(ascensor, 'Ascensor actualizado exitosamente'));
  } catch (error) {
    if (error.message === 'ASCENSOR_NOT_FOUND') {
      return res.status(404).json(errorResponse('Ascensor no encontrado', 'NOT_FOUND'));
    }
    if (error.message === 'SERIAL_NUMBER_EXISTS') {
      return res.status(400).json(errorResponse('El número de serie ya existe', 'DUPLICATE_ENTRY'));
    }
    next(error);
  }
};

const deleteAscensor = async (req, res, next) => {
  try {
    const result = await ascensoresService.deleteAscensor(req.params.id);
    res.status(200).json(successResponse(null, 'Ascensor eliminado exitosamente'));
  } catch (error) {
    if (error.message === 'ASCENSOR_NOT_FOUND') {
      return res.status(404).json(errorResponse('Ascensor no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createAscensor,
  getAscensores,
  getAscensorById,
  updateAscensor,
  deleteAscensor
};
