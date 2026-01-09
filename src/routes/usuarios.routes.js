const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validate.middleware');
const { createUserSchema, updateUserSchema } = require('../validators/usuarios.validator');

/**
 * @swagger
 * /api/usuarios:
 *   post:
 *     summary: Registrar nuevo técnico (Solo Admin)
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - dni
 *               - nombre
 *               - apellido
 *               - correo
 *               - contrasena_hash
 *             properties:
 *               dni:
 *                 type: string
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               correo:
 *                 type: string
 *               contrasena_hash:
 *                 type: string
 *               especialidad:
 *                 type: string
 *     responses:
 *       201:
 *         description: Técnico creado
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createUserSchema),
  usuariosController.createUser
);

/**
 * @swagger
 * /api/usuarios:
 *   get:
 *     summary: Listar técnicos
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista de técnicos
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  usuariosController.getUsers
);

/**
 * @swagger
 * /api/usuarios/carga-trabajo:
 *   get:
 *     summary: Ver carga de trabajo de técnicos
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Lista ordenada por carga laboral
 */
router.get(
  '/carga-trabajo',
  authenticate,
  authorize('ADMIN'),
  usuariosController.getUsersByWorkload
);

/**
 * @swagger
 * /api/usuarios/especialidad/{especialidad}:
 *   get:
 *     summary: Filtrar técnicos por especialidad
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: especialidad
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Lista filtrada
 */
router.get(
  '/especialidad/:especialidad',
  authenticate,
  authorize('ADMIN'),
  usuariosController.getUsersBySpecialty
);


/**
 * @swagger
 * /api/usuarios/{id}:
 *   get:
 *     summary: Obtener técnico por ID
 *     tags: [Usuarios]
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
 *         description: Detalles del técnico
 */
router.get(
  '/:id',
  authenticate,
  usuariosController.getUserById
);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   put:
 *     summary: Actualizar técnico
 *     tags: [Usuarios]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               nombre:
 *                 type: string
 *               especialidad:
 *                 type: string
 *     responses:
 *       200:
 *         description: Actualización exitosa
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateUserSchema),
  usuariosController.updateUser
);

/**
 * @swagger
 * /api/usuarios/{id}:
 *   delete:
 *     summary: Eliminar (desactivar) técnico
 *     tags: [Usuarios]
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
 *         description: Técnico eliminado
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  usuariosController.deleteUser
);

module.exports = router;
