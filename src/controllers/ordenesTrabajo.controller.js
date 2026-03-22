const ordenesTrabajoService = require('../services/ordenesTrabajo.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createOrdenTrabajo = async (req, res, next) => {
  try {
    const orden = await ordenesTrabajoService.createOrdenTrabajo(req.body);
    res.status(201).json(successResponse(orden, 'Orden de trabajo creada exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getOrdenesTrabajo = async (req, res, next) => {
  try {
    const ordenes = await ordenesTrabajoService.getOrdenesTrabajo(req.query);
    res.status(200).json(successResponse(ordenes, 'Lista de ordenes de trabajo'));
  } catch (error) {
    next(error);
  }
};

const getOrdenTrabajoById = async (req, res, next) => {
  try {
    const orden = await ordenesTrabajoService.getOrdenTrabajoById(req.params.id);
    res.status(200).json(successResponse(orden, 'Detalle de la orden de trabajo'));
  } catch (error) {
    if (error.message === 'ORDEN_NOT_FOUND') {
      return res.status(404).json(errorResponse('Orden no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateOrdenTrabajo = async (req, res, next) => {
  try {
    const orden = await ordenesTrabajoService.updateOrdenTrabajo(req.params.id, req.body);
    res.status(200).json(successResponse(orden, 'Orden de trabajo actualizada exitosamente'));
  } catch (error) {
    if (error.message === 'ORDEN_NOT_FOUND') {
      return res.status(404).json(errorResponse('Orden no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const patchOrdenEstado = async (req, res, next) => {
  try {
    const orden = await ordenesTrabajoService.updateOrdenTrabajo(req.params.id, { estado: req.body.estado });
    res.status(200).json(successResponse(orden, `Estado de orden actualizado a '${req.body.estado}'`));
  } catch (error) {
    if (error.message === 'ORDEN_NOT_FOUND') {
      return res.status(404).json(errorResponse('Orden no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteOrdenTrabajo = async (req, res, next) => {
  try {
    await ordenesTrabajoService.deleteOrdenTrabajo(req.params.id);
    res.status(200).json(successResponse(null, 'Orden de trabajo eliminada exitosamente'));
  } catch (error) {
    if (error.message === 'ORDEN_NOT_FOUND') {
      return res.status(404).json(errorResponse('Orden no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createOrdenTrabajo,
  getOrdenesTrabajo,
  getOrdenTrabajoById,
  updateOrdenTrabajo,
  patchOrdenEstado,
  deleteOrdenTrabajo
};
