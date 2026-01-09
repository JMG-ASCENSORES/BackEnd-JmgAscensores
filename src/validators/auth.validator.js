const Joi = require('joi');

const loginSchema = Joi.object({
  identificador: Joi.string().required()
    .messages({
      'string.empty': 'El identificador (DNI o correo) es requerido',
      'any.required': 'El identificador (DNI o correo) es requerido'
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
