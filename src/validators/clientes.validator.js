const Joi = require('joi');

const createClientSchema = Joi.object({
  tipo_cliente: Joi.string().max(50).optional(),
  contra: Joi.string().max(100).optional(),
  ubicacion: Joi.string().max(300).required()
    .messages({ 'any.required': 'La ubicación es requerida' }),
  ciudad: Joi.string().max(100).optional(),
  distrito: Joi.string().max(100).optional(),
  telefono: Joi.string().max(20).optional(),
  contacto_correo: Joi.string().email().max(100).optional(),
  contacto_nombre: Joi.string().max(100).optional(),
  contacto_apellido: Joi.string().max(100).optional(),
  contacto_telefono: Joi.string().max(20).optional(),
});

const updateClientSchema = Joi.object({
  tipo_cliente: Joi.string().max(50).optional(),
  contra: Joi.string().max(100).optional(),
  ubicacion: Joi.string().max(300).optional(),
  ciudad: Joi.string().max(100).optional(),
  distrito: Joi.string().max(100).optional(),
  telefono: Joi.string().max(20).optional(),
  contacto_correo: Joi.string().email().max(100).optional(),
  contacto_nombre: Joi.string().max(100).optional(),
  contacto_apellido: Joi.string().max(100).optional(),
  contacto_telefono: Joi.string().max(20).optional(),
  estado_activo: Joi.boolean().optional()
});

module.exports = {
  createClientSchema,
  updateClientSchema
};
