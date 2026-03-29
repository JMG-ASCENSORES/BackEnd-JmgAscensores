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
    const { page, limit, search, cliente_id, tipo_equipo, estado } = req.query;
    
    // Si mandan page o limit, pasamos a paginación
    if (page || limit || search) {
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = parseInt(limit, 10) || 10;
      
      const result = await ascensoresService.getAscensoresPaginated({ 
        page: pageNum, 
        limit: limitNum, 
        search, 
        cliente_id,
        tipo_equipo,
        estado
      });
      
      const meta = {
        totalItems: result.count,
        itemsPerPage: limitNum,
        currentPage: pageNum,
        totalPages: Math.ceil(result.count / limitNum)
      };
      
      return res.status(200).json(successResponse(result.rows, 'Ascensores obtenidos exitosamente', meta));
    }

    // Comportamiento Legacy (sin paginación)
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
