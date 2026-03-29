const configuracionService = require('../services/configuracion.service');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Get internal profile
 * GET /api/configuracion/perfil
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await configuracionService.getProfile(req.user.id, req.user.tipo);
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
 * Update internal profile
 * PATCH /api/configuracion/perfil
 */
const updateProfile = async (req, res, next) => {
  try {
    // Basic fields that can be updated
    const allowedFields = ['nombre', 'apellido', 'correo', 'telefono', 'contrasena', 'firma_defecto_base64'];
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) updateData[key] = req.body[key];
    }

    const result = await configuracionService.updateProfile(req.user.id, req.user.tipo, updateData);
    res.status(200).json(
      successResponse(result, 'Perfil actualizado correctamente')
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
 * Get global settings
 * GET /api/configuracion/sistema
 */
const getSystemSettings = async (req, res, next) => {
  try {
    const settings = await configuracionService.getSystemSettings();
    res.status(200).json(
      successResponse(settings, 'Configuraciones obtenidas correctamente')
    );
  } catch (error) {
    next(error);
  }
};

/**
 * Update a specific setting
 * PATCH /api/configuracion/sistema/:clave
 */
const updateSystemSetting = async (req, res, next) => {
  try {
    const { clave } = req.params;
    const { valor } = req.body;
    
    const result = await configuracionService.updateSystemSetting(clave, valor);
    res.status(200).json(
      successResponse(result, 'Configuración actualizada exitosamente')
    );
  } catch (error) {
    if (error.message === 'SETTING_NOT_FOUND') {
      return res.status(404).json(
        errorResponse('Configuración no encontrada', 'SETTING_NOT_FOUND')
      );
    }
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getSystemSettings,
  updateSystemSetting
};
