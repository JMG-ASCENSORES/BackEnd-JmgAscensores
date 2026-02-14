const Joi = require('joi');

const createMantenimientoSchema = Joi.object({
  titulo: Joi.string().max(100).required(),
  cliente_id: Joi.number().integer().optional(),
  ascensor_id: Joi.number().integer().optional(),
  trabajador_id: Joi.number().integer().optional(),
  tipo_trabajo: Joi.string().valid('mantenimiento', 'reparacion', 'inspeccion', 'emergencia').default('mantenimiento'),
  color: Joi.string().optional(),
  
  // Aceptamos fecha_programada O fecha_inicio (para flexibilidad con frontend)
  fecha_programada: Joi.date().iso().optional(),
  fecha_inicio: Joi.date().iso().optional(),
  fecha_fin: Joi.date().iso().optional(),
  
  hora_estimada_inicio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  hora_estimada_fin: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  
  tareas_designadas: Joi.string().max(500).optional(),
  observaciones: Joi.string().optional(),
  descripcion: Joi.string().optional()
}).unknown(true); // Permitir otros campos extra que pueda enviar el frontend

const updateMantenimientoSchema = Joi.object({
  titulo: Joi.string().max(100).optional(),
  cliente_id: Joi.number().integer().optional(),
  ascensor_id: Joi.number().integer().optional(),
  trabajador_id: Joi.number().integer().optional(),
  tipo_trabajo: Joi.string().valid('mantenimiento', 'reparacion', 'inspeccion', 'emergencia').optional(),
  color: Joi.string().optional(),
  
  fecha_programada: Joi.date().iso().optional(),
  fecha_inicio: Joi.date().iso().optional(),
  fecha_fin: Joi.date().iso().optional(),
  
  hora_estimada_inicio: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  hora_estimada_fin: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  
  estado: Joi.string().valid('pendiente', 'en_progreso', 'completado', 'cancelado').optional(),
  tareas_designadas: Joi.string().max(500).optional(),
  observaciones: Joi.string().optional(),
  descripcion: Joi.string().optional()
});

module.exports = {
  createMantenimientoSchema,
  updateMantenimientoSchema
};
