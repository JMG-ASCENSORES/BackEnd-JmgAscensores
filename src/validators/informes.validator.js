const Joi = require('joi');

const createInformeSchema = Joi.object({
  descripcion: Joi.string().required(),
  tipo_informe: Joi.string().valid('tecnico', 'incidencia', 'rutina').default('rutina'),
  mantenimiento_id: Joi.number().optional(),
  cliente_id: Joi.number().optional(),
});

const updateInformeSchema = Joi.object({
  descripcion: Joi.string(),
  estado_informe: Joi.string().valid('borrador', 'enviado', 'aprobado'),
  observaciones: Joi.string().optional()
});

module.exports = {
  createInformeSchema,
  updateInformeSchema
};
