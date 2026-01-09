const express = require('express');
const router = express.Router();
const rutasController = require('../controllers/rutas.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createRutaSchema, updateRutaSchema } = require('../validators/rutas.validator');

router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     RutaDiaria:
 *       type: object
 *       required:
 *         - trabajador_id
 *         - fecha_ruta
 *       properties:
 *         ruta_id:
 *           type: integer
 *         trabajador_id:
 *           type: integer
 *         fecha_ruta:
 *           type: string
 *           format: date
 *         estado:
 *           type: string
 *           enum: [pendiente, en_curso, completada]
 *         nombre_ruta:
 *           type: string
 * */

/**
 * @swagger
 * /api/rutas:
 *   get:
 *     summary: Listar rutas diarias
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de rutas
 *   post:
 *     summary: Crear ruta diaria
 *     tags: [Rutas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RutaDiaria'
 *     responses:
 *       201:
 *         description: Ruta creada
 */
router.post('/', validate(createRutaSchema), rutasController.createRuta);
router.get('/', rutasController.getRutas);

/**
 * @swagger
 * /api/rutas/{id}:
 *   get:
 *     summary: Obtener ruta por ID
 *     tags: [Rutas]
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
 *         description: Detalle de ruta
 *   put:
 *     summary: Actualizar ruta
 *     tags: [Rutas]
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
 *         description: Ruta actualizada
 *   delete:
 *     summary: Eliminar ruta
 *     tags: [Rutas]
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
 *         description: Ruta eliminada
 */
router.get('/:id', rutasController.getRutaById);
router.put('/:id', validate(updateRutaSchema), rutasController.updateRuta);
router.delete('/:id', rutasController.deleteRuta);

module.exports = router;
