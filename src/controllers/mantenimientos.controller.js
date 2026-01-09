const mantenimientosService = require('../services/mantenimientos.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await mantenimientosService.createMantenimiento(req.body);
    res.status(201).json(successResponse(mantenimiento, 'Mantenimiento programado exitosamente'));
  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json(errorResponse('Cliente no encontrado', 'NOT_FOUND'));
    }
    if (error.message === 'ASCENSOR_NOT_FOUND') {
      return res.status(404).json(errorResponse('Ascensor no encontrado', 'NOT_FOUND'));
    }
    if (error.message === 'ASCENSOR_BELONGS_TO_OTHER_CLIENT') {
      return res.status(400).json(errorResponse('El ascensor no pertenece al cliente especificado', 'BAD_REQUEST'));
    }
    next(error);
  }
};

const getMantenimientos = async (req, res, next) => {
  try {
    const mantenimientos = await mantenimientosService.getMantenimientos(req.query);
    res.status(200).json(successResponse(mantenimientos, 'Mantenimientos obtenidos exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getMantenimientoById = async (req, res, next) => {
  try {
    const mantenimiento = await mantenimientosService.getMantenimientoById(req.params.id);
    res.status(200).json(successResponse(mantenimiento, 'Mantenimiento obtenido exitosamente'));
  } catch (error) {
    if (error.message === 'MANTENIMIENTO_NOT_FOUND') {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await mantenimientosService.updateMantenimiento(req.params.id, req.body);
    res.status(200).json(successResponse(mantenimiento, 'Mantenimiento actualizado exitosamente'));
  } catch (error) {
    if (error.message === 'MANTENIMIENTO_NOT_FOUND') {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteMantenimiento = async (req, res, next) => {
  try {
    await mantenimientosService.deleteMantenimiento(req.params.id);
    res.status(200).json(successResponse(null, 'Mantenimiento eliminado exitosamente'));
  } catch (error) {
    if (error.message === 'MANTENIMIENTO_NOT_FOUND') {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createMantenimiento,
  getMantenimientos,
  getMantenimientoById,
  updateMantenimiento,
  deleteMantenimiento
};
