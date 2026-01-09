const { Administrador, Trabajador, Cliente, Sesion } = require('../models');
const { comparePassword } = require('../utils/password.util');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/jwt.util');

/**
 * Authenticate user (Admin or Trabajador)
 * @param {string} dni - DNI
 * @param {string} contrasena - Password
 * @returns {Object} - User data and tokens
 */
const login = async (dni, contrasena) => {
  let user = null;
  let tipo = null;
  let rol = null;

  // Try to find in Administradores
  user = await Administrador.findOne({
    where: {
      dni: dni,
      activo: true
    }
  });

  if (user) {
    tipo = 'administrador';
    rol = 'ADMIN';
  } else {
    // Try to find in Trabajadores
    user = await Trabajador.findOne({
      where: {
        dni: dni,
        estado_activo: true
      }
    });

    if (user) {
      tipo = 'trabajador';
      rol = 'TECNICO';
    } else {
      // Try to find in Clientes
      user = await Cliente.findOne({
        where: {
          dni: dni,
          estado_activo: true
        }
      });

      if (user) {
        tipo = 'cliente';
        rol = 'CLIENTE';
      }
    }
  }

  if (!user) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // Verify password
  // For Cliente, field is 'contra', for others 'contrasena_hash'
  const passwordHash = tipo === 'cliente' ? user.contra : user.contrasena_hash;
  const isPasswordValid = await comparePassword(contrasena, passwordHash);
  
  if (!isPasswordValid) {
    throw new Error('INVALID_CREDENTIALS');
  }

  // Generate tokens
  const userPayload = {
    id: tipo === 'administrador' ? user.admin_id : (tipo === 'trabajador' ? user.trabajador_id : user.cliente_id),
    dni: user.dni,
    correo: tipo === 'cliente' ? user.contacto_correo : user.correo,
    rol,
    tipo
  };

  const accessToken = generateAccessToken(userPayload);
  const refreshToken = generateRefreshToken(userPayload);

  // Create session
  const sessionData = {
    token: refreshToken,
    ip_address: null, // Will be set in controller
    user_agent: null, // Will be set in controller
    expira_en: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  };

  if (tipo === 'administrador') {
    sessionData.admin_id = user.admin_id;
  } else if (tipo === 'trabajador') {
    sessionData.trabajador_id = user.trabajador_id;
  } else {
    sessionData.cliente_id = user.cliente_id;
  }

  await Sesion.create(sessionData);

  return {
    user: {
      id: userPayload.id,
      dni: user.dni,
      nombre: user.nombre,
      apellido: user.apellido,
      correo: user.correo,
      rol,
      tipo
    },
    accessToken,
    refreshToken
  };
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} - New access token
 */
const refresh = async (refreshToken) => {
  // Verify refresh token
  let decoded;
  try {
    decoded = verifyToken(refreshToken, true);
  } catch (error) {
    throw new Error('INVALID_REFRESH_TOKEN');
  }

  // Check if session exists and is valid
  const session = await Sesion.findOne({
    where: {
      token: refreshToken,
      expira_en: {
        [require('sequelize').Op.gt]: new Date()
      }
    }
  });

  if (!session) {
    throw new Error('INVALID_SESSION');
  }

  // Get user data
  let user = null;
  let rol = null;

  if (decoded.tipo === 'administrador') {
    user = await Administrador.findByPk(decoded.id);
    rol = 'ADMIN';
  } else if (decoded.tipo === 'trabajador') {
    user = await Trabajador.findByPk(decoded.id);
    rol = 'TECNICO';
  } else {
    user = await Cliente.findByPk(decoded.id);
    rol = 'CLIENTE';
  }

  if (!user) {
    throw new Error('USER_NOT_FOUND');
  }

  // Generate new access token
  const userPayload = {
    id: decoded.id,
    dni: user.dni,
    correo: decoded.tipo === 'cliente' ? user.contacto_correo : user.correo,
    rol,
    tipo: decoded.tipo
  };

  const accessToken = generateAccessToken(userPayload);

  return { accessToken };
};

/**
 * Logout user
 * @param {string} refreshToken - Refresh token
 */
const logout = async (refreshToken) => {
  // Delete session
  await Sesion.destroy({
    where: { token: refreshToken }
  });

  return true;
};

module.exports = {
  login,
  refresh,
  logout
};