const express = require('express');
const router = express.Router();
const usuariosController = require('../controllers/usuarios.controller');
const authenticate = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/authorize.middleware');
const validate = require('../middlewares/validate.middleware');
const { createUserSchema, updateUserSchema } = require('../validators/usuarios.validator');

/**
 * @route   POST /api/usuarios
 * @desc    Create new user (técnico) - Admin only
 * @access  Private (Admin)
 */
router.post(
  '/',
  authenticate,
  authorize('ADMIN'),
  validate(createUserSchema),
  usuariosController.createUser
);

/**
 * @route   GET /api/usuarios
 * @desc    Get all users with filters
 * @access  Private (Admin)
 */
router.get(
  '/',
  authenticate,
  authorize('ADMIN'),
  usuariosController.getUsers
);

/**
 * @route   GET /api/usuarios/carga-trabajo
 * @desc    Get users sorted by workload
 * @access  Private (Admin)
 */
router.get(
  '/carga-trabajo',
  authenticate,
  authorize('ADMIN'),
  usuariosController.getUsersByWorkload
);

/**
 * @route   GET /api/usuarios/especialidad/:especialidad
 * @desc    Get users by specialty
 * @access  Private (Admin)
 */
router.get(
  '/especialidad/:especialidad',
  authenticate,
  authorize('ADMIN'),
  usuariosController.getUsersBySpecialty
);

/**
 * @route   GET /api/usuarios/:id
 * @desc    Get user by ID
 * @access  Private (Admin, or own profile for Técnico)
 */
router.get(
  '/:id',
  authenticate,
  usuariosController.getUserById
);

/**
 * @route   PUT /api/usuarios/:id
 * @desc    Update user
 * @access  Private (Admin)
 */
router.put(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  validate(updateUserSchema),
  usuariosController.updateUser
);

/**
 * @route   DELETE /api/usuarios/:id
 * @desc    Delete user (soft delete)
 * @access  Private (Admin)
 */
router.delete(
  '/:id',
  authenticate,
  authorize('ADMIN'),
  usuariosController.deleteUser
);

module.exports = router;
