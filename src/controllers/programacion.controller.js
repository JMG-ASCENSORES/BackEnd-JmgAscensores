const { Programacion, Trabajador, Cliente } = require('../models');
const { Op } = require('sequelize');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Obtener programaciones (eventos) en un rango de fechas
 * GET /api/programaciones?start=YYYY-MM-DD&end=YYYY-MM-DD
 */
const getProgramaciones = async (req, res, next) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json(
        errorResponse('Se requieren parámetros start y end', 'MISSING_PARAMS')
      );
    }

    const eventos = await Programacion.findAll({
      where: {
        fecha_inicio: {
          [Op.gte]: new Date(start)
        },
        fecha_fin: {
          [Op.lte]: new Date(end)
        }
      },
      include: [
        {
          model: Trabajador,
          attributes: ['nombre', 'apellido']
        },
        {
          model: Cliente,
          attributes: ['contacto_nombre', 'contacto_apellido']
        }
      ]
    });

    // Mapear al formato que prefiere FullCalendar (opcional, o hacerlo en frontend)
    const eventosFormateados = eventos.map(evento => ({
      id: evento.programacion_id,
      title: evento.titulo,
      start: evento.fecha_inicio,
      end: evento.fecha_fin,
      color: evento.color,
      extendedProps: {
        trabajador_id: evento.trabajador_id,
        cliente_id: evento.cliente_id,
        estado: evento.estado,
        descripcion: evento.descripcion,
        trabajador: evento.Trabajador,
        cliente: evento.Cliente
      }
    }));

    res.status(200).json(eventsIsArray(eventosFormateados)); // FullCalendar espera array directo a veces, pero mantendremos standar API
    // Nota: Si el frontend usa el servicio Angular, podemos devolver el objeto standard
  } catch (error) {
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
    const { titulo, start, end, trabajador_id, cliente_id, color, descripcion } = req.body;

    const nuevaProgramacion = await Programacion.create({
      titulo,
      fecha_inicio: start, // FullCalendar envía 'start'
      fecha_fin: end,     // FullCalendar envía 'end'
      trabajador_id,
      cliente_id,
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
    const { start, end, titulo, color, estado, descripcion, trabajador_id, cliente_id } = req.body;

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
