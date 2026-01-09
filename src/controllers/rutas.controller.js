const rutasService = require('../services/rutas.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createRuta = async (req, res, next) => {
  try {
    const ruta = await rutasService.createRuta(req.body);
    res.status(201).json(successResponse(ruta, 'Ruta creada exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getRutas = async (req, res, next) => {
  try {
    const rutas = await rutasService.getRutas();
    res.status(200).json(successResponse(rutas, 'Lista de rutas diarias'));
  } catch (error) {
    next(error);
  }
};

const getRutaById = async (req, res, next) => {
  try {
    const ruta = await rutasService.getRutaById(req.params.id);
    res.status(200).json(successResponse(ruta, 'Detalle de la ruta'));
  } catch (error) {
    if (error.message === 'RUTA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Ruta no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateRuta = async (req, res, next) => {
  try {
    const ruta = await rutasService.updateRuta(req.params.id, req.body);
    res.status(200).json(successResponse(ruta, 'Ruta actualizada'));
  } catch (error) {
    if (error.message === 'RUTA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Ruta no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteRuta = async (req, res, next) => {
  try {
    await rutasService.deleteRuta(req.params.id);
    res.status(200).json(successResponse(null, 'Ruta eliminada'));
  } catch (error) {
    if (error.message === 'RUTA_NOT_FOUND') {
      return res.status(404).json(errorResponse('Ruta no encontrada', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createRuta,
  getRutas,
  getRutaById,
  updateRuta,
  deleteRuta
};
