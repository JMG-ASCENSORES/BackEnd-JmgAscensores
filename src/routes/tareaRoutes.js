const express = require('express');
const router = express.Router();
const tareasController = require('../controllers/tareas.controller');
const authenticate = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const { createTareaSchema, updateTareaSchema } = require('../validators/tareas.validator');

// Protected routes
router.use(authenticate);

/**
 * @swagger
 * components:
 *   schemas:
 *     Tarea:
 *       type: object
 *       required:
 *         - descripcion
 *       properties:
 *         tarea_id:
 *           type: integer
 *         descripcion:
 *           type: string
 *         prioridad:
 *           type: string
 *           enum: [baja, media, alta]
 *         estado:
 *           type: string
 *           enum: [pendiente, en_progreso, completada]
 *         fecha_limite:
 *           type: string
 *           format: date
 * */

/**
 * @swagger
 * /api/tareas:
 *   get:
 *     summary: Listar tareas
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de tareas
 *   post:
 *     summary: Crear tarea
 *     tags: [Tareas]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Tarea'
 *     responses:
 *       201:
 *         description: Tarea creada
 */
router.post('/', validate(createTareaSchema), tareasController.createTarea);
router.get('/', tareasController.getTareas);

/**
 * @swagger
 * /api/tareas/{id}:
 *   get:
 *     summary: Obtener tarea por ID
 *     tags: [Tareas]
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
 *         description: Detalle de tarea
 *   put:
 *     summary: Actualizar tarea
 *     tags: [Tareas]
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
 *         description: Tarea actualizada
 *   delete:
 *     summary: Eliminar tarea
 *     tags: [Tareas]
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
 *         description: Tarea eliminada
 */
router.get('/:id', tareasController.getTareaById);
router.put('/:id', validate(updateTareaSchema), tareasController.updateTarea);
router.delete('/:id', tareasController.deleteTarea);

module.exports = router;
