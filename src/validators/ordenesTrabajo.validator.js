const Joi = require('joi');

const patchOrdenEstadoSchema = Joi.object({
  estado: Joi.string()
    .valid('pendiente', 'en_progreso', 'completado', 'cancelado')
    .required()
    .messages({
      'any.only': 'Estado inválido. Valores permitidos: pendiente, en_progreso, completado, cancelado.',
      'any.required': 'El campo estado es obligatorio.'
    })
});

module.exports = { patchOrdenEstadoSchema };
