const { Programacion, Trabajador, Cliente, Ascensor } = require('../models');
const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Obtener programaciones (eventos)
 * GET /api/programaciones
 * No filtra por fecha en SQL porque las columnas son TEXT en la DB.
 */
const getProgramaciones = async (req, res, next) => {
  try {
    const { trabajador_id, cliente_id, ascensor_id } = req.query;

    const whereClause = {};
    if (trabajador_id) whereClause.trabajador_id = trabajador_id;
    if (cliente_id)   whereClause.cliente_id   = cliente_id;
    if (ascensor_id)  whereClause.ascensor_id  = ascensor_id;

    const eventos = await Programacion.findAll({
      where: whereClause,
      include: [
        {
          model: Trabajador,
          attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad'],
          required: false
        },
        {
          model: Cliente,
          attributes: ['cliente_id', 'contacto_nombre', 'contacto_apellido'],
          required: false
        },
        {
          model: Ascensor,
          attributes: ['ascensor_id', 'tipo_equipo', 'marca', 'modelo', 'numero_serie'],
          required: false
        }
      ],
      order: [['programacion_id', 'ASC']]
    });

    const eventosFormateados = eventos.map(evento => ({
      id: evento.programacion_id,
      title: evento.titulo || `Programación #${evento.programacion_id}`,
      start: evento.fecha_inicio || new Date().toISOString(),
      end: evento.fecha_fin || evento.fecha_inicio || new Date().toISOString(),
      color: evento.color || '#3788d8',
      extendedProps: {
        trabajador_id: evento.trabajador_id,
        cliente_id:    evento.cliente_id,
        ascensor_id:   evento.ascensor_id,
        tipo_trabajo:  evento.tipo_trabajo,
        estado:        evento.estado,
        descripcion:   evento.descripcion,
        trabajador:    evento.Trabajador,
        cliente:       evento.Cliente,
        ascensor:      evento.Ascensor
      }
    }));

    return res.status(200).json(eventosFormateados);
  } catch (error) {
    console.error('Error en getProgramaciones:', error);
    next(error);
  }
};

// Helper para devolver array directo si se usa como feed directo
const eventsIsArray = (data) => data; 
// Pero como usamos standard response util:
// En el frontend se deberá extraer .data


/**
 * Crear una nueva programación
 * POST /api/programaciones
 */
const createProgramacion = async (req, res, next) => {
  try {
    const { titulo, start, end, trabajador_id, cliente_id, ascensor_id, tipo_trabajo, color, descripcion } = req.body;

    const nuevaProgramacion = await Programacion.create({
      titulo,
      fecha_inicio: start, // FullCalendar envía 'start'
      fecha_fin: end,     // FullCalendar envía 'end'
      trabajador_id,
      cliente_id,
      ascensor_id,
      tipo_trabajo: tipo_trabajo || 'mantenimiento',
      color,
      descripcion,
      estado: 'pendiente'
    });

    res.status(201).json(
      successResponse(nuevaProgramacion, 'Evento creado exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Actualizar una programación (ej. Drag & Drop)
 * PUT /api/programaciones/:id
 */
const updateProgramacion = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { start, end, titulo, color, estado, descripcion, trabajador_id, cliente_id, ascensor_id, tipo_trabajo } = req.body;

    const programacion = await Programacion.findByPk(id);

    if (!programacion) {
      return res.status(404).json(
        errorResponse('Programación no encontrada', 'NOT_FOUND')
      );
    }

    // Actualizar campos si vienen en el body
    if (start) programacion.fecha_inicio = start;
    if (end) programacion.fecha_fin = end;
    if (titulo) programacion.titulo = titulo;
    if (color) programacion.color = color;
    if (estado) programacion.estado = estado;
    if (descripcion) programacion.descripcion = descripcion;
    if (trabajador_id !== undefined) programacion.trabajador_id = trabajador_id;
    if (cliente_id !== undefined) programacion.cliente_id = cliente_id;
    if (ascensor_id !== undefined) programacion.ascensor_id = ascensor_id;
    if (tipo_trabajo) programacion.tipo_trabajo = tipo_trabajo;

    await programacion.save();

    res.status(200).json(
      successResponse(programacion, 'Evento actualizado exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Eliminar una programación
 * DELETE /api/programaciones/:id
 */
const deleteProgramacion = async (req, res, next) => {
  try {
    const { id } = req.params;

    const deleted = await Programacion.destroy({
      where: { programacion_id: id }
    });

    if (!deleted) {
      return res.status(404).json(
        errorResponse('Programación no encontrada', 'NOT_FOUND')
      );
    }

    res.status(200).json(
      successResponse(null, 'Evento eliminado exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProgramaciones,
  createProgramacion,
  updateProgramacion,
  deleteProgramacion
};
