const Joi = require('joi');

const loginSchema = Joi.object({
  dni: Joi.string().required()
    .messages({
      'string.empty': 'El DNI es requerido',
      'any.required': 'El DNI es requerido'
    }),
  contrasena: Joi.string().required()
    .messages({
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida'
    })
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required()
    .messages({
      'string.empty': 'El refresh token es requerido',
      'any.required': 'El refresh token es requerido'
    })
});

module.exports = {
  loginSchema,
  refreshSchema
};
