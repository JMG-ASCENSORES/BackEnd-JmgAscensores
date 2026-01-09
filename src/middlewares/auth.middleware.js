const { verifyToken } = require('../utils/jwt.util');
const { errorResponse } = require('../utils/response.util');

/**
 * Authentication middleware - Verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json(
        errorResponse('No se proporcionó token de autenticación', 'NO_TOKEN')
      );
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = {
      id: decoded.id,
      dni: decoded.dni,
      correo: decoded.correo,
      rol: decoded.rol,
      tipo: decoded.tipo
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(
        errorResponse('Token expirado', 'TOKEN_EXPIRED')
      );
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(
        errorResponse('Token inválido', 'INVALID_TOKEN')
      );
    }

    return res.status(500).json(
      errorResponse('Error al verificar autenticación', 'AUTH_ERROR')
    );
  }
};

module.exports = authenticate;
