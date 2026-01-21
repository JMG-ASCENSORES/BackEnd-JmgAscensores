const Joi = require('joi');

const createInformeSchema = Joi.object({
  descripcion_trabajo: Joi.string().required(),
  tipo_informe: Joi.string().valid('Técnico', 'Mantenimiento', 'tecnico', 'mantenimiento').default('Técnico'),
  fecha_informe: Joi.date().iso().optional(),
  hora_informe: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  observaciones: Joi.string().allow('', null).optional(),
  cliente_id: Joi.number().required(),
  ascensor_id: Joi.number().required(),
  trabajador_id: Joi.number().required(),
  // Allow other fields if necessary
  fecha_creacion: Joi.any().optional()
});

const updateInformeSchema = Joi.object({
  descripcion_trabajo: Joi.string(),
  tipo_informe: Joi.string(),
  fecha_informe: Joi.date().iso(),
  hora_informe: Joi.string(),
  observaciones: Joi.string().allow('', null),
  cliente_id: Joi.number(),
  ascensor_id: Joi.number(),
  trabajador_id: Joi.number(),
  estado_informe: Joi.string().valid('borrador', 'enviado', 'aprobado')
});

module.exports = {
  createInformeSchema,
  updateInformeSchema
};
