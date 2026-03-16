const express = require('express');
const router = express.Router();
const tareasMaestrasController = require('../controllers/tareasMaestras.controller');
const authenticate = require('../middlewares/auth.middleware');

// Protect routes
router.use(authenticate);

/**
 * @swagger
 * /api/tareas-maestras:
 *   get:
 *     summary: Get all tareas maestras
 *     tags: [Tareas Maestras]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', tareasMaestrasController.getTareasMaestras);

/**
 * @swagger
 * /api/tareas-maestras:
 *   post:
 *     summary: Create a new tarea maestra
 *     tags: [Tareas Maestras]
 *     security:
 *       - bearerAuth: []
 */
router.post('/', tareasMaestrasController.createTareaMaestra);

router.get('/:id', tareasMaestrasController.getTareaMaestraById);
router.put('/:id', tareasMaestrasController.updateTareaMaestra);
router.delete('/:id', tareasMaestrasController.deleteTareaMaestra);

module.exports = router;
