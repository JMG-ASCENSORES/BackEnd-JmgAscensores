const Joi = require('joi');

const createAscensorSchema = Joi.object({
  cliente_id: Joi.number().integer().required(),
  tipo_equipo: Joi.string().max(50).required(),
  marca: Joi.string().max(100).optional(),
  modelo: Joi.string().max(100).optional(),
  numero_serie: Joi.string().max(100).required(),
  capacidad: Joi.string().max(100).optional(),
  piso_cantidad: Joi.number().integer().optional(),
  fecha_ultimo_mantenimiento: Joi.date().iso().optional(),
  estado: Joi.string().max(50).optional(),
  observaciones: Joi.string().optional()
});

const updateAscensorSchema = Joi.object({
  cliente_id: Joi.number().integer().optional(),
  tipo_equipo: Joi.string().max(50).optional(),
  marca: Joi.string().max(100).optional(),
  modelo: Joi.string().max(100).optional(),
  numero_serie: Joi.string().max(100).optional(),
  capacidad: Joi.string().max(100).optional(),
  piso_cantidad: Joi.number().integer().optional(),
  fecha_ultimo_mantenimiento: Joi.date().iso().optional(),
  estado: Joi.string().max(50).optional(),
  observaciones: Joi.string().optional()
});

module.exports = {
  createAscensorSchema,
  updateAscensorSchema
};
