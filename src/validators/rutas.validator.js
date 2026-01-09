const Joi = require('joi');

const createRutaSchema = Joi.object({
  trabajador_id: Joi.number().required(),
  fecha_ruta: Joi.date().required(),
  estado: Joi.string().valid('pendiente', 'en_curso', 'completada').default('pendiente'),
  nombre_ruta: Joi.string().optional()
});

const updateRutaSchema = Joi.object({
  estado: Joi.string().valid('pendiente', 'en_curso', 'completada'),
  observaciones: Joi.string().optional()
});

module.exports = {
  createRutaSchema,
  updateRutaSchema
};
