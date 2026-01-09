const Joi = require('joi');

const createTareaSchema = Joi.object({
  descripcion: Joi.string().required().max(500),
  prioridad: Joi.string().valid('baja', 'media', 'alta').default('media'),
  fecha_limite: Joi.date().optional(),
});

const updateTareaSchema = Joi.object({
  descripcion: Joi.string().max(500),
  prioridad: Joi.string().valid('baja', 'media', 'alta'),
  estado: Joi.string().valid('pendiente', 'en_progreso', 'completada'),
  fecha_limite: Joi.date(),
  activo: Joi.boolean()
});

module.exports = {
  createTareaSchema,
  updateTareaSchema
};
