const tareasMaestrasService = require('../services/tareasMaestras.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createTareaMaestra = async (req, res, next) => {
  try {
    const tarea = await tareasMaestrasService.createTareaMaestra(req.body);
    res.status(201).json(successResponse(tarea, 'Tarea maestra creada exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getTareasMaestras = async (req, res, next) => {
  try {
    const tareas = await tareasMaestrasService.getTareasMaestras(req.query);
    res.status(200).json(successResponse(tareas, 'Lista de tareas maestras'));
  } catch (error) {
    next(error);
  }
};

const getTareaMaestraById = async (req, res, next) => {
  try {
    const tarea = await tareasMaestrasService.getTareaMaestraById(req.params.id);
    res.status(200).json(successResponse(tarea, 'Detalle de la tarea maestra'));
  } catch (error) {
    if (error.message === 'TAREA_MAESTRA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Tarea maestra no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateTareaMaestra = async (req, res, next) => {
  try {
    const tarea = await tareasMaestrasService.updateTareaMaestra(req.params.id, req.body);
    res.status(200).json(successResponse(tarea, 'Tarea maestra actualizada exitosamente'));
  } catch (error) {
    if (error.message === 'TAREA_MAESTRA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Tarea maestra no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteTareaMaestra = async (req, res, next) => {
  try {
    await tareasMaestrasService.deleteTareaMaestra(req.params.id);
    res.status(200).json(successResponse(null, 'Tarea maestra inhabilitada exitosamente'));
  } catch (error) {
    if (error.message === 'TAREA_MAESTRA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Tarea maestra no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createTareaMaestra,
  getTareasMaestras,
  getTareaMaestraById,
  updateTareaMaestra,
  deleteTareaMaestra
};
