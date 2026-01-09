const clientesService = require('../services/clientes.service');
const { successResponse, errorResponse } = require('../utils/response.util');

const createClient = async (req, res, next) => {
  try {
    const client = await clientesService.createClient(req.body);
    res.status(201).json(successResponse(client, 'Cliente creado exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getClients = async (req, res, next) => {
  try {
    const clients = await clientesService.getClients();
    res.status(200).json(successResponse(clients, 'Clientes obtenidos exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getClientById = async (req, res, next) => {
  try {
    const client = await clientesService.getClientById(req.params.id);
    res.status(200).json(successResponse(client, 'Cliente obtenido exitosamente'));
  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json(errorResponse('Cliente no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const updateClient = async (req, res, next) => {
  try {
    const client = await clientesService.updateClient(req.params.id, req.body);
    res.status(200).json(successResponse(client, 'Cliente actualizado exitosamente'));
  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json(errorResponse('Cliente no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const deleteClient = async (req, res, next) => {
  try {
    await clientesService.deleteClient(req.params.id);
    res.status(200).json(successResponse(null, 'Cliente eliminado exitosamente'));
  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json(errorResponse('Cliente no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

const getClientAscensores = async (req, res, next) => {
  try {
    const ascensores = await clientesService.getClientAscensores(req.params.id);
    res.status(200).json(successResponse(ascensores, 'Ascensores obtenidos exitosamente'));
  } catch (error) {
    if (error.message === 'CLIENT_NOT_FOUND') {
      return res.status(404).json(errorResponse('Cliente no encontrado', 'NOT_FOUND'));
    }
    next(error);
  }
};

module.exports = {
  createClient,
  getClients,
  getClientById,
  updateClient,
  deleteClient,
  getClientAscensores
};
