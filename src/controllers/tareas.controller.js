const tareasService = require('../services/tareas.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createTarea = async (req, res, next) => {
  try {
    const tarea = await tareasService.createTarea(req.body);
    res.status(201).json(successResponse(tarea, 'Tarea creada exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getTareas = async (req, res, next) => {
  try {
    const tareas = await tareasService.getTareas();
    res.status(200).json(successResponse(tareas, 'Lista de tareas'));
  } catch (error) {
    next(error);
  }
};

const getTareaById = async (req, res, next) => {
  try {
    const tarea = await tareasService.getTareaById(req.params.id);
    res.status(200).json(successResponse(tarea, 'Detalle de la tarea'));
  } catch (error) {
    if (error.message === 'TAREA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Tarea no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateTarea = async (req, res, next) => {
  try {
    const tarea = await tareasService.updateTarea(req.params.id, req.body);
    res.status(200).json(successResponse(tarea, 'Tarea actualizada exitosamente'));
  } catch (error) {
    if (error.message === 'TAREA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Tarea no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteTarea = async (req, res, next) => {
  try {
    await tareasService.deleteTarea(req.params.id);
    res.status(200).json(successResponse(null, 'Tarea eliminada exitosamente'));
  } catch (error) {
    if (error.message === 'TAREA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Tarea no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createTarea,
  getTareas,
  getTareaById,
  updateTarea,
  deleteTarea
};
