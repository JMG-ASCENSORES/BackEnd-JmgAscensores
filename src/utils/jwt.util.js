const jwt = require('jsonwebtoken');

/**
 * Generate an access token
 * @param {Object} user - User object with id, role, etc.
 * @returns {string} - JWT access token
 */
const generateAccessToken = (user) => {
  const payload = {
    id: user.id,
    dni: user.dni,
    correo: user.correo,
    rol: user.rol, // 'ADMIN' or 'TECNICO'
    tipo: user.tipo // 'administrador' or 'trabajador'
  };

  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  });
};

/**
 * Generate a refresh token
 * @param {Object} user - User object with id
 * @returns {string} - JWT refresh token
 */
const generateRefreshToken = (user) => {
  const payload = {
    id: user.id,
    tipo: user.tipo
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
  });
};

/**
 * Verify a token
 * @param {string} token - JWT token
 * @param {boolean} isRefresh - Whether this is a refresh token
 * @returns {Object} - Decoded token payload
 */
const verifyToken = (token, isRefresh = false) => {
  const secret = isRefresh ? process.env.JWT_REFRESH_SECRET : process.env.JWT_SECRET;
  return jwt.verify(token, secret);
};

/**
 * Decode a token without verification
 * @param {string} token - JWT token
 * @returns {Object} - Decoded token payload
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  decodeToken
};
