const express = require('express');
const router = express.Router();
const informesController = require('../controllers/informes.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createInformeSchema, updateInformeSchema, patchInformeSchema } = require('../validators/informes.validator');

router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Informe:
 *       type: object
 *       required:
 *         - descripcion
 *       properties:
 *         informe_id:
 *           type: integer
 *         tipo_informe:
 *           type: string
 *           enum: [Técnico, Mantenimiento]
 *         descripcion:
 *           type: string
 *         fecha_informe:
 *           type: string
 *           format: date
 *         estado_informe:
 *           type: string
 * */

/**
 * @swagger
 * /api/informes:
 *   get:
 *     summary: Listar informes
 *     tags: [Informes]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de informes
 *   post:
 *     summary: Crear informe
 *     tags: [Informes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Informe'
 *     responses:
 *       201:
 *         description: Informe creado
 */
router.post('/', validate(createInformeSchema), informesController.createInforme);
router.get('/', informesController.getInformes);

/**
 * @swagger
 * /api/informes/{id}:
 *   get:
 *     summary: Obtener informe por ID
 *     tags: [Informes]
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
 *         description: Detalle del informe
 *   put:
 *     summary: Actualizar informe
 *     tags: [Informes]
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
 *         description: Informe actualizado
 *   delete:
 *     summary: Eliminar informe
 *     tags: [Informes]
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
 *         description: Informe eliminado
 */
router.get('/:id/pdf', informesController.getInformePdf);
router.get('/:id', informesController.getInformeById);
router.put('/:id', validate(updateInformeSchema), informesController.updateInforme);
router.patch('/:id', validate(patchInformeSchema), informesController.updateInforme);
router.delete('/:id', informesController.deleteInforme);

module.exports = router;
