/**
 * mantenimientos.controller.js
 * Usa el modelo Mantenimiento (tabla "Mantenimientos") directamente.
 */

const { Mantenimiento, Trabajador, Cliente, Ascensor } = require('../models');
const { successResponse, errorResponse } = require('../utils/response.util');

// Helper: convierte 0 o undefined a null (para FK de PostgreSQL)
const toNullIfZero = (val) => (!val || val === 0 || val === '0') ? null : val;

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mantenimientos
// ─────────────────────────────────────────────────────────────────────────────
const getMantenimientos = async (req, res, next) => {
  try {
    const { trabajador_id, cliente_id, ascensor_id } = req.query;

    const whereClause = {};
    if (toNullIfZero(trabajador_id)) whereClause.trabajador_id = trabajador_id;
    if (toNullIfZero(cliente_id))   whereClause.cliente_id   = cliente_id;
    if (toNullIfZero(ascensor_id))  whereClause.ascensor_id  = ascensor_id;

    const mantenimientos = await Mantenimiento.findAll({
      where: whereClause,
      include: [
        {
          model: Trabajador,
          attributes: ['trabajador_id', 'nombre', 'apellido', 'especialidad'],
          required: false
        },
        {
          model: Cliente,
          attributes: ['cliente_id', 'contacto_nombre', 'contacto_apellido', 'ubicacion'],
          required: false
        },
        {
          model: Ascensor,
          attributes: ['ascensor_id', 'tipo_equipo', 'marca', 'modelo', 'numero_serie'],
          required: false
        }
      ],
      order: [['mantenimiento_id', 'ASC']]
    });

    const eventos = mantenimientos.map(m => ({
      id: m.mantenimiento_id,
      title: m.titulo || `Mantenimiento #${m.mantenimiento_id}`,
      start: m.fecha_inicio || m.fecha_programada || new Date().toISOString(),
      end: m.fecha_fin || m.fecha_inicio || new Date().toISOString(),
      color: m.color || '#3788d8',
      extendedProps: {
        trabajador_id: m.trabajador_id,
        cliente_id:    m.cliente_id,
        ascensor_id:   m.ascensor_id,
        tipo_trabajo:  m.tipo_trabajo,
        estado:        m.estado,
        descripcion:   m.descripcion || m.observaciones,
        trabajador:    m.Trabajador,
        cliente:       m.Cliente,
        ascensor:      m.Ascensor
      }
    }));

    return res.status(200).json(eventos);
  } catch (error) {
    console.error('Error en getMantenimientos:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/mantenimientos
// ─────────────────────────────────────────────────────────────────────────────
const createMantenimiento = async (req, res, next) => {
  try {
    const {
      titulo,
      fecha_programada,
      hora_estimada_inicio,
      hora_estimada_fin,
      trabajador_id,
      cliente_id,
      ascensor_id,
      tipo_trabajo,
      color,
      descripcion,
      observaciones,
      estado
    } = req.body;

    const fecha      = fecha_programada || new Date().toISOString().split('T')[0];
    const horaInicio = hora_estimada_inicio || '08:00';
    const horaFin    = hora_estimada_fin    || '09:00';

    const nuevoMantenimiento = await Mantenimiento.create({
      titulo:     titulo || 'Sin título',
      fecha_programada: fecha,
      hora_estimada_inicio: horaInicio,
      hora_estimada_fin: horaFin,
      fecha_inicio: `${fecha}T${horaInicio}:00`,
      fecha_fin:    `${fecha}T${horaFin}:00`,
      trabajador_id: toNullIfZero(trabajador_id),
      cliente_id:    toNullIfZero(cliente_id),
      ascensor_id:   toNullIfZero(ascensor_id),
      tipo_trabajo:  tipo_trabajo || 'mantenimiento',
      color:         color        || '#3788d8',
      descripcion:   descripcion  || observaciones || null,
      observaciones: observaciones || null,
      estado:        estado        || 'pendiente'
    });

    return res.status(201).json(successResponse({
      id:    nuevoMantenimiento.mantenimiento_id,
      title: nuevoMantenimiento.titulo,
      start: nuevoMantenimiento.fecha_inicio,
      end:   nuevoMantenimiento.fecha_fin,
      color: nuevoMantenimiento.color,
      extendedProps: {
        trabajador_id: nuevoMantenimiento.trabajador_id,
        cliente_id:    nuevoMantenimiento.cliente_id,
        ascensor_id:   nuevoMantenimiento.ascensor_id,
        tipo_trabajo:  nuevoMantenimiento.tipo_trabajo,
        estado:        nuevoMantenimiento.estado,
        descripcion:   nuevoMantenimiento.descripcion
      }
    }, 'Mantenimiento programado exitosamente'));
  } catch (error) {
    console.error('Error en createMantenimiento:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/mantenimientos/:id
// ─────────────────────────────────────────────────────────────────────────────
const getMantenimientoById = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id, {
      include: [
        { model: Trabajador, required: false },
        { model: Cliente,    required: false },
        { model: Ascensor,   required: false }
      ]
    });
    if (!mantenimiento) {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }
    return res.status(200).json(successResponse(mantenimiento, 'Mantenimiento obtenido'));
  } catch (error) {
    console.error('Error en getMantenimientoById:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/mantenimientos/:id
// ─────────────────────────────────────────────────────────────────────────────
const updateMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id);
    if (!mantenimiento) {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }

    await mantenimiento.update(req.body);
    return res.status(200).json(successResponse(mantenimiento, 'Mantenimiento actualizado exitosamente'));
  } catch (error) {
    console.error('Error en updateMantenimiento:', error);
    next(error);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/mantenimientos/:id
// ─────────────────────────────────────────────────────────────────────────────
const deleteMantenimiento = async (req, res, next) => {
  try {
    const mantenimiento = await Mantenimiento.findByPk(req.params.id);
    if (!mantenimiento) {
      return res.status(404).json(errorResponse('Mantenimiento no encontrado', 'NOT_FOUND'));
    }
    await mantenimiento.destroy();
    return res.status(200).json(successResponse(null, 'Mantenimiento eliminado exitosamente'));
  } catch (error) {
    console.error('Error en deleteMantenimiento:', error);
    next(error);
  }
};

module.exports = {
  getMantenimientos,
  getMantenimientoById,
  createMantenimiento,
  updateMantenimiento,
  deleteMantenimiento
};
