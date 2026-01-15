const { verifyToken } = require('../utils/jwt.util');
const { errorResponse } = require('../utils/response.util');

/**
 * Authentication middleware - Verify JWT token
 */
const authenticate = async (req, res, next) => {
  try {
    let token;

    // Try to get token from cookie first (preferred method)
    if (req.cookies && req.cookies.accessToken) {
      token = req.cookies.accessToken;
    } 
    // Fall back to Authorization header (backwards compatibility)
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.substring(7); // Remove 'Bearer ' prefix
    }
    
    if (!token) {
      return res.status(401).json(
        errorResponse('No se proporcionó token de autenticación', 'NO_TOKEN')
      );
    }

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
