const Joi = require('joi');

const createAscensorSchema = Joi.object({
  cliente_id: Joi.number().integer().required(),
  tipo_equipo: Joi.string().max(50).required(),
  marca: Joi.string().max(100).optional(),
  modelo: Joi.string().max(100).optional(),
  numero_serie: Joi.string().max(100).required(),
  capacidad_kg: Joi.number().integer().min(0).allow(null, '').optional(),
  capacidad_personas: Joi.number().integer().min(0).allow(null, '').optional(),
  piso_cantidad: Joi.number().integer().min(1).allow(null, '').optional(),
  fecha_ultimo_mantenimiento: Joi.date().iso().allow(null, '').optional(),
  estado: Joi.string().max(50).optional(),
  observaciones: Joi.string().allow('', null).optional()
});

const updateAscensorSchema = Joi.object({
  cliente_id: Joi.number().integer().optional(),
  tipo_equipo: Joi.string().max(50).optional(),
  marca: Joi.string().max(100).optional(),
  modelo: Joi.string().max(100).optional(),
  numero_serie: Joi.string().max(100).optional(),
  capacidad_kg: Joi.number().integer().min(0).allow(null, '').optional(),
  capacidad_personas: Joi.number().integer().min(0).allow(null, '').optional(),
  piso_cantidad: Joi.number().integer().min(1).allow(null, '').optional(),
  fecha_ultimo_mantenimiento: Joi.date().iso().allow(null, '').optional(),
  estado: Joi.string().max(50).optional(),
  observaciones: Joi.string().allow('', null).optional()
});

module.exports = {
  createAscensorSchema,
  updateAscensorSchema
};
