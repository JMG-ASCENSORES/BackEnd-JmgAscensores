const Joi = require('joi');

const createUserSchema = Joi.object({
  dni: Joi.string().length(8).pattern(/^[0-9]+$/).required()
    .messages({
      'string.length': 'El DNI debe tener 8 dígitos',
      'string.pattern.base': 'El DNI solo debe contener números',
      'any.required': 'El DNI es requerido'
    }),
  nombre: Joi.string().max(50).required()
    .messages({
      'string.max': 'El nombre no puede exceder 50 caracteres',
      'any.required': 'El nombre es requerido'
    }),
  apellido: Joi.string().max(50).required()
    .messages({
      'string.max': 'El apellido no puede exceder 50 caracteres',
      'any.required': 'El apellido es requerido'
    }),
  edad: Joi.number().integer().min(18).max(100).optional(),
  correo: Joi.string().email().max(100).required()
    .messages({
      'string.email': 'El correo debe ser válido',
      'any.required': 'El correo es requerido'
    }),
  telefono: Joi.string().max(20).optional(),
  contrasena: Joi.string().min(6).required()
    .messages({
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'any.required': 'La contraseña es requerida'
    }),
  fecha_contrato: Joi.date().optional(),
  especialidad: Joi.string().max(100).optional(),
  foto_perfil: Joi.string().max(255).optional()
});

const updateUserSchema = Joi.object({
  nombre: Joi.string().max(50).optional(),
  apellido: Joi.string().max(50).optional(),
  edad: Joi.number().integer().min(18).max(100).optional(),
  correo: Joi.string().email().max(100).optional(),
  telefono: Joi.string().max(20).optional(),
  contrasena: Joi.string().min(6).optional(),
  fecha_contrato: Joi.date().optional(),
  especialidad: Joi.string().max(100).optional(),
  foto_perfil: Joi.string().max(255).optional(),
  estado_activo: Joi.boolean().optional()
});

module.exports = {
  createUserSchema,
  updateUserSchema
};
