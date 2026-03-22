const express = require('express');
const router = express.Router();
const ordenesTrabajoController = require('../controllers/ordenesTrabajo.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { patchOrdenEstadoSchema } = require('../validators/ordenesTrabajo.validator');

router.use(authenticate);

/**
 * @swagger
 * /api/ordenes-trabajo:
 *   get:
 *     summary: Listar todas las ordenes de trabajo
 *     tags: [Ordenes Trabajo]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', ordenesTrabajoController.getOrdenesTrabajo);

/**
 * @swagger
 * /api/ordenes-trabajo:
 *   post:
 *     summary: Crear una orden de trabajo (Mantenimiento/Reparacion)
 *     tags: [Ordenes Trabajo]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', ordenesTrabajoController.createOrdenTrabajo);

router.get('/:id', ordenesTrabajoController.getOrdenTrabajoById);
router.put('/:id', ordenesTrabajoController.updateOrdenTrabajo);
router.patch('/:id/estado', validate(patchOrdenEstadoSchema), ordenesTrabajoController.patchOrdenEstado);
router.delete('/:id', ordenesTrabajoController.deleteOrdenTrabajo);

module.exports = router;
