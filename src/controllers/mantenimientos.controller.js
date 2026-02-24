const mantenimientosService = require('../services/mantenimientos.service');
const { successResponse, errorResponse } = require('../utils/response.util');
const { Mantenimiento, Trabajador, Cliente, Ascensor } = require('../models');
const { Op } = require('sequelize');

const createMantenimiento = async (req, res, next) => {
  try {
    // Si viene fecha_programada pero no fecha_inicio, las sincronizamos
    if (req.body.fecha_programada && !req.body.fecha_inicio) {
      req.body.fecha_inicio = `${req.body.fecha_programada}T${req.body.hora_estimada_inicio || '08:00'}:00`;
    }
    
    const mantenimiento = await Mantenimiento.create(req.body);
    res.status(201).json(successResponse(mantenimiento, 'Mantenimiento programado exitosamente'));
  } catch (error) {
    next(error);
  }
};

const getMantenimientos = async (req, res, next) => {
  try {
    const { start, end, trabajador_id, cliente_id, ascensor_id } = req.query;
    
    let whereClause = {};
    
    // Filtro por rango de fechas (para el calendario)
    if (start && end) {
      whereClause.fecha_inicio = {
        [Op.gte]: new Date(start)
      };
      whereClause.fecha_fin = {
        [Op.lte]: new Date(end)
      };
    }

    // Otros filtros opcionales
    if (trabajador_id) whereClause.trabajador_id = trabajador_id;
    if (cliente_id) whereClause.cliente_id = cliente_id;
    if (ascensor_id) whereClause.ascensor_id = ascensor_id;

    const mantenimientos = await Mantenimiento.findAll({
      where: whereClause,
      include: [
        {
          model: Trabajador,
          attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad']
        },
        {
          model: Cliente,
          attributes: ['cliente_id', 'contacto_nombre', 'contacto_apellido', 'ubicacion']
        },
        {
          model: Ascensor,
          attributes: ['ascensor_id', 'tipo_equipo', 'marca', 'modelo', 'numero_serie']
        }
      ],
      order: [['fecha_inicio', 'ASC']]
    });

    // Si el cliente pide formato FullCalendar (generalmente inferido si manda start/end)
    if (start && end) {
      const eventos = mantenimientos.map(m => ({
        id: m.mantenimiento_id,
        title: m.titulo || `Mantenimiento #${m.mantenimiento_id}`,
        start: m.fecha_inicio,
        end: m.fecha_fin,
        color: m.color || '#3788d8',
        extendedProps: {
          trabajador_id: m.trabajador_id,
          cliente_id: m.cliente_id,
          ascensor_id: m.ascensor_id,
          tipo_trabajo: m.tipo_trabajo,
          estado: m.estado,
          descripcion: m.descripcion || m.observaciones,
          trabajador: m.Trabajador,
          cliente: m.Cliente,
          ascensor: m.Ascensor
        }
      }));
      return res.status(200).json(eventos);
    }

    // Formato estándar API response
    res.status(200).json(successResponse(mantenimientos, 'Mantenimientos obtenidos exitosamente'));
  } catch (error) {
    console.error('Error en getMantenimientos:', error);
    next(error);
  }
};

const getMantenimientoById = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id, {
      include: [Trabajador, Cliente, Ascensor]
    });
    
    if (!mantenimiento) {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }

    res.status(200).json(successResponse(mantenimiento, 'Mantenimiento obtenido exitosamente'));
  } catch (error) {
    next(error);
  }
};

const updateMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id);
    
    if (!mantenimiento) {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }

    await mantenimiento.update(req.body);
    res.status(200).json(successResponse(mantenimiento, 'Mantenimiento actualizado exitosamente'));
  } catch (error) {
    next(error);
  }
};

const deleteMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id);
    
    if (!mantenimiento) {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }

    await mantenimiento.destroy();
    res.status(200).json(successResponse(null, 'Mantenimiento eliminado exitosamente'));
  } catch (error) {
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
