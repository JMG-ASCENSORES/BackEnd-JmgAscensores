const express = require('express');
const router = express.Router();
const evidenciasController = require('../controllers/evidencias.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createEvidenciaSchema, updateEvidenciaSchema } = require('../validators/evidencias.validator');

router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Evidencia:
 *       type: object
 *       required:
 *         - tipo_evidencia
 *       properties:
 *         evidencia_id:
 *           type: integer
 *         tipo_evidencia:
 *           type: string
 *           enum: [foto, video, documento]
 *         url_archivo:
 *           type: string
 *         descripcion:
 *           type: string
 *         fecha_registro:
 *           type: string
 *           format: date-time
 * */

/**
 * @swagger
 * /api/evidencias:
 *   get:
 *     summary: Listar evidencias
 *     tags: [Evidencias]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de evidencias
 *   post:
 *     summary: Registrar evidencia
 *     tags: [Evidencias]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Evidencia'
 *     responses:
 *       201:
 *         description: Evidencia creada
 */
router.post('/', validate(createEvidenciaSchema), evidenciasController.createEvidencia);
router.get('/', evidenciasController.getEvidencias);

/**
 * @swagger
 * /api/evidencias/{id}:
 *   get:
 *     summary: Obtener evidencia por ID
 *     tags: [Evidencias]
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
 *         description: Detalle de evidencia
 *   put:
 *     summary: Actualizar evidencia
 *     tags: [Evidencias]
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
 *         description: Evidencia actualizada
 *   delete:
 *     summary: Eliminar evidencia
 *     tags: [Evidencias]
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
 *         description: Evidencia eliminada
 */
router.get('/:id', evidenciasController.getEvidenciaById);
router.put('/:id', validate(updateEvidenciaSchema), evidenciasController.updateEvidencia);
router.delete('/:id', evidenciasController.deleteEvidencia);

module.exports = router;
