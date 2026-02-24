const Joi = require('joi');

const createClientSchema = Joi.object({
  dni: Joi.string().required().min(8).max(20),
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
  dni: Joi.string().min(8).max(20).optional(),
  tipo_cliente: Joi.string().max(50).optional(),
  ruc: Joi.string().max(15).allow(null, '').optional(),
  nombre_comercial: Joi.string().max(200).allow(null, '').optional(),
  contra: Joi.string().max(100).optional(),
  ubicacion: Joi.string().max(300).optional(),
  latitud: Joi.number().allow(null).optional(),
  longitud: Joi.number().allow(null).optional(),
  ciudad: Joi.string().max(100).allow(null, '').optional(),
  distrito: Joi.string().max(100).allow(null, '').optional(),
  telefono: Joi.string().max(20).allow(null, '').optional(),
  contacto_correo: Joi.string().email().max(100).optional(),
  contacto_nombre: Joi.string().max(100).optional(),
  contacto_apellido: Joi.string().max(100).allow(null, '').optional(),
  contacto_telefono: Joi.string().max(20).optional(),
  estado_activo: Joi.boolean().optional()
});

module.exports = {
  createClientSchema,
  updateClientSchema
};
