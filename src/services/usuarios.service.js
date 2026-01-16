const { Trabajador, Asignacion } = require('../models');
const { hashPassword } = require('../utils/password.util');
const { Op } = require('sequelize');

/**
 * Create a new user (técnico)
 * @param {Object} userData - User data
 * @returns {Object} - Created user
 */
const createUser = async (userData) => {
  // Check if DNI already exists
  const existingDNI = await Trabajador.findOne({ where: { dni: userData.dni } });
  if (existingDNI) {
    throw new Error('DNI_EXISTS');
  }

  // Check if email already exists
  const existingEmail = await Trabajador.findOne({ where: { correo: userData.correo } });
  if (existingEmail) {
    throw new Error('EMAIL_EXISTS');
  }

  // Hash password
  const contrasena_hash = await hashPassword(userData.contrasena);

  // Create user
  const user = await Trabajador.create({
    ...userData,
    contrasena_hash,
    contrasena: undefined // Remove plain password
  });

  // Remove password hash from response
  const userResponse = user.toJSON();
  delete userResponse.contrasena_hash;

  return userResponse;
};

/**
 * Get all users with filters
 * @param {Object} filters - Filter options
 * @returns {Array} - List of users
 */
const getUsers = async (filters = {}) => {
  const where = {};

  if (filters.especialidad) {
    where.especialidad = filters.especialidad;
  }

  if (filters.estado_activo !== undefined) {
    where.estado_activo = filters.estado_activo;
  }

  const users = await Trabajador.findAll({
    where,
    attributes: { exclude: ['contrasena_hash'] },
    order: [['fecha_creacion', 'DESC']]
  });

  return users;
};

/**
 * Get user by ID
 * @param {number} id - User ID
 * @returns {Object} - User data
 */
const getUserById = async (id) => {
  const user = await Trabajador.findByPk(id, {
    attributes: { exclude: ['contrasena_hash'] }
  });

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return user;
};

/**
 * Update user
 * @param {number} id - User ID
 * @param {Object} updateData - Data to update
 * @returns {Object} - Updated user
 */
const updateUser = async (id, updateData) => {
  const user = await Trabajador.findByPk(id);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // If updating email, check uniqueness
  if (updateData.correo && updateData.correo !== user.correo) {
    const existingEmail = await Trabajador.findOne({
      where: {
        correo: updateData.correo,
        trabajador_id: { [Op.ne]: id }
      }
    });
    if (existingEmail) {
      throw new Error('EMAIL_EXISTS');
    }
  }

  // If updating password, hash it
  if (updateData.contrasena) {
    updateData.contrasena_hash = await hashPassword(updateData.contrasena);
    delete updateData.contrasena;
  }

  await user.update(updateData);

  const userResponse = user.toJSON();
  delete userResponse.contrasena_hash;

  return userResponse;
};

/**
 * Delete user (soft delete)
 * @param {number} id - User ID
 * @returns {boolean} - Success
 */
const deleteUser = async (id) => {
  const user = await Trabajador.findByPk(id);

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Soft delete
  await user.update({ estado_activo: false });

  return true;
};

/**
 * Get users by specialty
 * @param {string} especialidad - Specialty
 * @returns {Array} - List of users
 */
const getUsersBySpecialty = async (especialidad) => {
  const users = await Trabajador.findAll({
    where: {
      especialidad,
      estado_activo: true
    },
    attributes: { exclude: ['contrasena_hash'] }
  });

  return users;
};

/**
 * Get users sorted by workload
 * @returns {Array} - List of users with workload
 */
const getUsersByWorkload = async () => {
  const users = await Trabajador.findAll({
    where: { estado_activo: true },
    attributes: {
      exclude: ['contrasena_hash'],
      include: [
        [
          require('sequelize').literal(`(
            SELECT COUNT(*)
            FROM "Asignaciones" AS asignacion
            INNER JOIN "Mantenimientos" AS mantenimiento
            ON asignacion.mantenimiento_id = mantenimiento.mantenimiento_id
            WHERE asignacion.trabajador_id = "Trabajador".trabajador_id
            AND mantenimiento.estado IN ('pendiente', 'en_proceso')
          )`),
          'carga_trabajo'
        ]
      ]
    },
    order: [[require('sequelize').literal('carga_trabajo'), 'ASC']]
  });

  return users;
};

module.exports = {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  getUsersBySpecialty,
  getUsersByWorkload
};
