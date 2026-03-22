const Joi = require('joi');

const createInformeSchema = Joi.object({
  descripcion_trabajo: Joi.string().allow('', null).optional(),
  tipo_informe: Joi.string().valid('Técnico', 'Mantenimiento', 'tecnico', 'mantenimiento').default('Técnico'),
  fecha_informe: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}(T.*)?$/).optional(),
  hora_informe: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  observaciones: Joi.string().allow('', null).optional(),
  orden_id: Joi.number().required(),
  cliente_id: Joi.number().required(),
  ascensor_id: Joi.number().required(),
  trabajador_id: Joi.number().required(),
  // Campos de firma
  firma_tecnico_id: Joi.number().integer().optional().allow(null),
  firma_cliente_id: Joi.number().integer().optional().allow(null),
  firma_tecnico: Joi.string().allow('', null).optional(),  // base64 de firma nueva
  firma_cliente: Joi.string().allow('', null).optional(),  // base64 de firma nueva
  fecha_creacion: Joi.any().optional(),
  detalles: Joi.array().items(Joi.object({
    tarea_maestra_id: Joi.number().optional(),
    tarea_id: Joi.number().optional(),
    realizado: Joi.boolean().required(),
    observaciones: Joi.string().allow('', null).optional(),
    categoria: Joi.string().allow('', null).optional(),
    TareaMaestra: Joi.any().optional()
  })).optional()
});

const updateInformeSchema = Joi.object({
  descripcion_trabajo: Joi.string().allow('', null).optional(),
  tipo_informe: Joi.string(),
  fecha_informe: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}(T.*)?$/),
  hora_informe: Joi.string(),
  observaciones: Joi.string().allow('', null),
  cliente_id: Joi.number(),
  ascensor_id: Joi.number(),
  trabajador_id: Joi.number(),
  orden_id: Joi.number().optional(),
  estado_informe: Joi.string().valid('borrador', 'enviado', 'aprobado'),
  // Campos de firma
  firma_tecnico_id: Joi.number().integer().optional().allow(null),
  firma_cliente_id: Joi.number().integer().optional().allow(null),
  firma_tecnico: Joi.string().allow('', null).optional(),  // base64 de firma nueva
  firma_cliente: Joi.string().allow('', null).optional(),  // base64 de firma nueva
  detalles: Joi.array().items(Joi.object({
    tarea_maestra_id: Joi.number().optional(),
    tarea_id: Joi.number().optional(),
    realizado: Joi.boolean().required(),
    observaciones: Joi.string().allow('', null).optional(),
    categoria: Joi.string().allow('', null).optional(),
    TareaMaestra: Joi.any().optional()
  })).optional()
});

const patchInformeSchema = Joi.object({
  descripcion_trabajo: Joi.string().allow('', null).optional(),
  tipo_informe: Joi.string().optional(),
  fecha_informe: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}(T.*)?$/).optional(),
  hora_informe: Joi.string().optional(),
  observaciones: Joi.string().allow('', null).optional(),
  cliente_id: Joi.number().optional(),
  ascensor_id: Joi.number().optional(),
  trabajador_id: Joi.number().optional(),
  orden_id: Joi.number().optional(),
  estado_informe: Joi.string().valid('borrador', 'enviado', 'aprobado').optional(),
  firma_tecnico_id: Joi.number().integer().optional().allow(null),
  firma_cliente_id: Joi.number().integer().optional().allow(null),
  firma_tecnico: Joi.string().allow('', null).optional(),
  firma_cliente: Joi.string().allow('', null).optional(),
  detalles: Joi.array().items(Joi.object({
    tarea_maestra_id: Joi.number().optional(),
    tarea_id: Joi.number().optional(),
    realizado: Joi.boolean().required(),
    observaciones: Joi.string().allow('', null).optional(),
    categoria: Joi.string().allow('', null).optional(),
    TareaMaestra: Joi.any().optional()
  })).optional()
});

module.exports = {
  createInformeSchema,
  updateInformeSchema,
  patchInformeSchema
};
