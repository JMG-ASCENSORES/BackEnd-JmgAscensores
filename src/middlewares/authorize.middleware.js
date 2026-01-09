const { errorResponse } = require('../utils/response.util');

/**
 * Authorization middleware - Check user roles
 * @param {Array<string>} allowedRoles - Array of allowed roles ['ADMIN', 'TECNICO']
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json(
        errorResponse('Usuario no autenticado', 'NOT_AUTHENTICATED')
      );
    }

    if (!allowedRoles.includes(req.user.rol)) {
      return res.status(403).json(
        errorResponse('No tiene permisos para realizar esta acción', 'FORBIDDEN')
      );
    }

    next();
  };
};

module.exports = authorize;
