const express = require('express');
const router = express.Router();
const ascensoresController = require('../controllers/ascensores.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createAscensorSchema, updateAscensorSchema } = require('../validators/ascensores.validator');

// Protected routes (Require Auth)
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Ascensor:
 *       type: object
 *       required:
 *         - cliente_id
 *         - tipo_equipo
 *         - marca
 *       properties:
 *         ascensor_id:
 *           type: integer
 *         cliente_id:
 *           type: integer
 *         tipo_equipo:
 *           type: string
 *         marca:
 *           type: string
 *         modelo:
 *           type: string
 *         numero_serie:
 *           type: string
 *         piso_cantidad:
 *           type: integer
 * */

/**
 * @swagger
 * /api/ascensores:
 *   get:
 *     summary: Listar todos los ascensores
 *     tags: [Ascensores]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de ascensores
 *   post:
 *     summary: Crear nuevo ascensor
 *     tags: [Ascensores]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Ascensor'
 *     responses:
 *       201:
 *         description: Ascensor creado
 */
router.post('/', validate(createAscensorSchema), ascensoresController.createAscensor);
router.get('/', ascensoresController.getAscensores);

/**
 * @swagger
 * /api/ascensores/{id}:
 *   get:
 *     summary: Obtener ascensor por ID
 *     tags: [Ascensores]
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
 *         description: Datos del ascensor
 *   put:
 *     summary: Actualizar ascensor
 *     tags: [Ascensores]
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
 *         description: Ascensor actualizado
 *   delete:
 *     summary: Eliminar ascensor
 *     tags: [Ascensores]
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
 *         description: Ascensor eliminado
 */
router.get('/:id', ascensoresController.getAscensorById);
router.put('/:id', validate(updateAscensorSchema), ascensoresController.updateAscensor);
router.delete('/:id', ascensoresController.deleteAscensor);

module.exports = router;
