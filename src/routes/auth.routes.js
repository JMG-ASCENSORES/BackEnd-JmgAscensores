const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const validate = require('../middlewares/validate.middleware');
const { loginSchema, refreshSchema } = require('../validators/auth.validator');

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Iniciar sesión (Admin, Técnico, Cliente)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identificador
 *               - contrasena
 *             properties:
 *               identificador:
 *                 type: string
 *                 description: Correo, DNI o Código de Cliente
 *                 example: admin@jmg.com
 *               contrasena:
 *                 type: string
 *                 description: Contraseña del usuario
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:
 *                       type: object
 *                     accessToken:
 *                       type: string
 *                     refreshToken:
 *                       type: string
 *       401:
 *         description: Credenciales inválidas
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Renovar token de acceso
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Token renovado
 */
router.post('/refresh', validate(refreshSchema), authController.refreshToken);

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Cerrar sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
router.post('/logout', validate(refreshSchema), authController.logout);

module.exports = router;
