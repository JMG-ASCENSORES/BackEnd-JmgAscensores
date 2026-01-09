const express = require('express');
const router = express.Router();
const mantenimientosController = require('../controllers/mantenimientos.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createMantenimientoSchema, updateMantenimientoSchema } = require('../validators/mantenimientos.validator');

// Protected routes (Require Auth)
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Mantenimiento:
 *       type: object
 *       required:
 *         - ascensor_id
 *         - fecha_programada
 *       properties:
 *         mantenimiento_id:
 *           type: integer
 *         ascensor_id:
 *           type: integer
 *         fecha_programada:
 *           type: string
 *           format: date
 *         estado:
 *           type: string
 * */

/**
 * @swagger
 * /api/mantenimientos:
 *   get:
 *     summary: Listar mantenimientos
 *     tags: [Mantenimientos]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de mantenimientos
 *   post:
 *     summary: Programar nuevo mantenimiento
 *     tags: [Mantenimientos]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Mantenimiento'
 *     responses:
 *       201:
 *         description: Mantenimiento creado
 */
router.post('/', validate(createMantenimientoSchema), mantenimientosController.createMantenimiento);
router.get('/', mantenimientosController.getMantenimientos);

/**
 * @swagger
 * /api/mantenimientos/{id}:
 *   get:
 *     summary: Obtener mantenimiento por ID
 *     tags: [Mantenimientos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detalles del mantenimiento
 *   put:
 *     summary: Actualizar mantenimiento
 *     tags: [Mantenimientos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mantenimiento actualizado
 *   delete:
 *     summary: Eliminar mantenimiento
 *     tags: [Mantenimientos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Mantenimiento eliminado
 */
router.get('/:id', mantenimientosController.getMantenimientoById);
router.put('/:id', validate(updateMantenimientoSchema), mantenimientosController.updateMantenimiento);
router.delete('/:id', mantenimientosController.deleteMantenimiento);

module.exports = router;
