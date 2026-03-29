const express = require('express');
const router = express.Router();
const configuracionController = require('../controllers/configuracion.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');

/**
 * @swagger
 * /api/configuracion/perfil:
 *   get:
 *     summary: Obtener perfil del usuario autenticado (Admin o Técnico)
 *     tags: [Configuracion]
 *     security:
 *       - bearerAuth: []
 */
router.get('/perfil', authenticate, configuracionController.getProfile);

/**
 * @swagger
 * /api/configuracion/perfil:
 *   patch:
 *     summary: Actualizar perfil del usuario autenticado
 *     tags: [Configuracion]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/perfil', authenticate, configuracionController.updateProfile);

/**
 * @swagger
 * /api/configuracion/sistema:
 *   get:
 *     summary: Obtener configuraciones globales del sistema (Solo Admin)
 *     tags: [Configuracion]
 *     security:
 *       - bearerAuth: []
 */
router.get('/sistema', authenticate, authorize('ADMIN'), configuracionController.getSystemSettings);

/**
 * @swagger
 * /api/configuracion/sistema/{clave}:
 *   patch:
 *     summary: Actualizar una configuración específica del sistema (Solo Admin)
 *     tags: [Configuracion]
 *     security:
 *       - bearerAuth: []
 */
router.patch('/sistema/:clave', authenticate, authorize('ADMIN'), configuracionController.updateSystemSetting);

module.exports = router;
