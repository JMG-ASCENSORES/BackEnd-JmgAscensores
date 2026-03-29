const { Administrador, Trabajador, Configuracion } = require('../models');
const { hashPassword } = require('../utils/password.util');
const { Op } = require('sequelize');

/**
 * Get profile data depending on user type
 */
const getProfile = async (userId, userType) => {
  let user;
  if (userType === 'administrador') {
    user = await Administrador.findByPk(userId, {
      attributes: { exclude: ['contrasena_hash'] }
    });
  } else {
    user = await Trabajador.findByPk(userId, {
      attributes: { exclude: ['contrasena_hash'] },
      include: ['FirmaPredeterminada']
    });
  }

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  return user;
};

/**
 * Update profile data
 */
const updateProfile = async (userId, userType, updateData) => {
  let user;
  const Model = userType === 'administrador' ? Administrador : Trabajador;
  const idField = userType === 'administrador' ? 'admin_id' : 'trabajador_id';

  user = await Model.findByPk(userId);
  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Handle password hashing if provided
  if (updateData.contrasena) {
    updateData.contrasena_hash = await hashPassword(updateData.contrasena);
    delete updateData.contrasena;
  }

  // Check email uniqueness if changed
  if (updateData.correo && updateData.correo !== user.correo) {
    const existingEmail = await Model.findOne({
      where: {
        correo: updateData.correo,
        [idField]: { [Op.ne]: userId }
      }
    });
    if (existingEmail) {
      throw new Error('EMAIL_EXISTS');
    }
  }

  // Handle signature if it's a worker
  if (userType === 'trabajador' && updateData.firma_defecto_base64) {
    const { Firma } = require('../models');
    if (user.firma_defecto_id) {
      await Firma.update(
        { base64_data: updateData.firma_defecto_base64 },
        { where: { firma_id: user.firma_defecto_id } }
      );
    } else {
      const nueva = await Firma.create({ base64_data: updateData.firma_defecto_base64 });
      updateData.firma_defecto_id = nueva.firma_id;
    }
    delete updateData.firma_defecto_base64;
  }

  await user.update(updateData);

  const result = user.toJSON();
  delete result.contrasena_hash;
  return result;
};

/**
 * System-wide settings
 */
const getSystemSettings = async () => {
  return await Configuracion.findAll({
    order: [['clave', 'ASC']]
  });
};

const updateSystemSetting = async (clave, valor) => {
  const setting = await Configuracion.findOne({ where: { clave } });
  if (!setting) {
    throw new Error('SETTING_NOT_FOUND');
  }

  await setting.update({ 
    valor,
    fecha_actualizacion: new Date()
  });

  return setting;
};

module.exports = {
  getProfile,
  updateProfile,
  getSystemSettings,
  updateSystemSetting
};
