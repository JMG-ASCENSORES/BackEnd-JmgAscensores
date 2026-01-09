const Joi = require('joi');

const createEvidenciaSchema = Joi.object({
  informe_id: Joi.number().optional(),
  mantenimiento_id: Joi.number().optional(),
  tipo_evidencia: Joi.string().valid('foto', 'video', 'documento').required(),
  url_archivo: Joi.string().uri().optional(), // In real app, this might be handled by upload middleware
  descripcion: Joi.string().optional()
});

const updateEvidenciaSchema = Joi.object({
  descripcion: Joi.string().optional()
});

module.exports = {
  createEvidenciaSchema,
  updateEvidenciaSchema
};
