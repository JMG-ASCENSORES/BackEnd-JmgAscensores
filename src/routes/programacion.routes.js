const express = require('express');
const router = express.Router();
const programacionController = require('../controllers/programacion.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const Joi = require('joi');

// Apply authentication middleware to all routes
router.use(authenticate);

const patchProgramacionEstadoSchema = Joi.object({
  estado: Joi.string()
    .valid('pendiente', 'en_progreso', 'completada', 'cancelada')
    .required()
    .messages({
      'any.only': 'Estado inválido. Valores permitidos: pendiente, en_progreso, completada, cancelada.',
      'any.required': 'El campo estado es obligatorio.'
    })
});

// Routes
router.get('/', programacionController.getProgramaciones);
router.get('/:id', programacionController.getProgramacionById);
router.post('/', programacionController.createProgramacion);
router.put('/:id', programacionController.updateProgramacion);
router.patch('/:id/estado', validate(patchProgramacionEstadoSchema), programacionController.patchEstado);
router.delete('/:id', programacionController.deleteProgramacion);

module.exports = router;
