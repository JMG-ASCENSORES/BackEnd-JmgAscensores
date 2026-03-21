const usuariosService = require('../services/usuarios.service');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Create user (técnico)
 * POST /api/usuarios
 */
const createUser = async (req, res, next) => {
  try {
    const user = await usuariosService.createUser(req.body);
    res.status(201).json(
      successResponse(user, 'Usuario creado exitosamente')
    );
  } catch (error) {
    if (error.message === 'DNI_EXISTS') {
      return res.status(409).json(
        errorResponse('El DNI ya está registrado', 'DNI_EXISTS')
      );
    }
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(409).json(
        errorResponse('El correo ya está registrado', 'EMAIL_EXISTS')
      );
    }
    next(error);
  }
};

/**
 * Get all users
 * GET /api/usuarios
 */
const getUsers = async (req, res, next) => {
  try {
    const filters = {
      especialidad: req.query.especialidad,
      estado_activo: req.query.estado_activo
    };
    
    const users = await usuariosService.getUsers(filters);
    res.status(200).json(
      successResponse(users, 'Usuarios obtenidos exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get all active technicians (for dropdowns/selects)
 * GET /api/usuarios/tecnicos
 */
const getTecnicos = async (req, res, next) => {
  try {
    const filters = {
      estado_activo: true
    };
    
    const tecnicos = await usuariosService.getUsers(filters);
    
    // Return simplified format for dropdowns
    const tecnicosSimplificados = tecnicos.map(t => ({
      trabajador_id: t.trabajador_id,
      nombre: t.nombre,
      apellido: t.apellido,
      nombre_completo: `${t.nombre} ${t.apellido}`,
      especialidad: t.especialidad
    }));
    
    res.status(200).json(
      successResponse(tecnicosSimplificados, 'Técnicos obtenidos exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 * GET /api/usuarios/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await usuariosService.getUserById(req.params.id);
    res.status(200).json(
      successResponse(user, 'Usuario obtenido exitosamente')
    );
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(
        errorResponse('Usuario no encontrado', 'USER_NOT_FOUND')
      );
    }
    next(error);
  }
};

/**
 * Update user
 * PUT /api/usuarios/:id
 */
const updateUser = async (req, res, next) => {
  try {
    const user = await usuariosService.updateUser(req.params.id, req.body);
    res.status(200).json(
      successResponse(user, 'Usuario actualizado exitosamente')
    );
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(
        errorResponse('Usuario no encontrado', 'USER_NOT_FOUND')
      );
    }
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(409).json(
        errorResponse('El correo ya está registrado', 'EMAIL_EXISTS')
      );
    }
    next(error);
  }
};

/**
 * Delete user (soft delete)
 * DELETE /api/usuarios/:id
 */
const deleteUser = async (req, res, next) => {
  try {
    await usuariosService.deleteUser(req.params.id);
    res.status(200).json(
      successResponse(null, 'Usuario eliminado exitosamente')
    );
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(
        errorResponse('Usuario no encontrado', 'USER_NOT_FOUND')
      );
    }
    next(error);
  }
};

/**
 * Get users by specialty
 * GET /api/usuarios/especialidad/:especialidad
 */
const getUsersBySpecialty = async (req, res, next) => {
  try {
    const users = await usuariosService.getUsersBySpecialty(req.params.especialidad);
    res.status(200).json(
      successResponse(users, 'Usuarios obtenidos exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get users by workload
 * GET /api/usuarios/carga-trabajo
 */
const getUsersByWorkload = async (req, res, next) => {
  try {
    const users = await usuariosService.getUsersByWorkload();
    res.status(200).json(
      successResponse(users, 'Usuarios obtenidos exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Get own profile (for authenticated worker)
 * GET /api/usuarios/me
 */
const getMyProfile = async (req, res, next) => {
  try {
    const user = await usuariosService.getUserById(req.user.id);
    res.status(200).json(
      successResponse(user, 'Perfil obtenido exitosamente')
    );
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(
        errorResponse('Usuario no encontrado', 'USER_NOT_FOUND')
      );
    }
    next(error);
  }
};

/**
 * Update own profile (for authenticated worker)
 * PUT /api/usuarios/me
 */
const updateMyProfile = async (req, res, next) => {
  try {
    // Workers can only update their own limited fields
    const allowedFields = ['nombre', 'apellido', 'correo', 'telefono', 'contrasena_hash', 'firma_defecto_base64'];
    const filtered = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) filtered[key] = req.body[key];
    }
    const user = await usuariosService.updateUser(req.user.id, filtered);
    res.status(200).json(
      successResponse(user, 'Perfil actualizado exitosamente')
    );
  } catch (error) {
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(
        errorResponse('Usuario no encontrado', 'USER_NOT_FOUND')
      );
    }
    if (error.message === 'EMAIL_EXISTS') {
      return res.status(409).json(
        errorResponse('El correo ya está registrado', 'EMAIL_EXISTS')
      );
    }
    next(error);
  }
};

module.exports = {
  createUser,
  getUsers,
  getTecnicos,
  getUserById,
  updateUser,
  deleteUser,
  getUsersBySpecialty,
  getUsersByWorkload,
  getMyProfile,
  updateMyProfile
};
