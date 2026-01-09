const Joi = require('joi');

const createMantenimientoSchema = Joi.object({
  cliente_id: Joi.number().integer().required(),
  ascensor_id: Joi.number().integer().required(),
  fecha_programada: Joi.date().iso().required(),
  hora_estimada_inicio: Joi.string().regex(/^([0-9]{2})\:([0-9]{2})$/).optional(),
  hora_estimada_fin: Joi.string().regex(/^([0-9]{2})\:([0-9]{2})$/).optional(),
  tareas_designadas: Joi.string().max(500).optional(),
  estado: Joi.string().max(50).optional(),
  observaciones: Joi.string().optional()
});

const updateMantenimientoSchema = Joi.object({
  fecha_programada: Joi.date().iso().optional(),
  hora_estimada_inicio: Joi.string().regex(/^([0-9]{2})\:([0-9]{2})$/).optional(),
  hora_estimada_fin: Joi.string().regex(/^([0-9]{2})\:([0-9]{2})$/).optional(),
  tareas_designadas: Joi.string().max(500).optional(),
  estado: Joi.string().max(50).optional(),
  observaciones: Joi.string().optional()
});

module.exports = {
  createMantenimientoSchema,
  updateMantenimientoSchema
};
