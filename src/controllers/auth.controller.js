const authService = require('../services/auth.service');
const { successResponse, errorResponse } = require('../utils/response.util');

/**
 * Login endpoint
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { dni, contrasena } = req.body;
    
    const result = await authService.login(dni, contrasena);

    // Update session with IP and user agent
    const { Sesion } = require('../models');
    await Sesion.update(
      {
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.headers['user-agent']
      },
      {
        where: { token: result.refreshToken }
      }
    );


    // Set cookies with tokens
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Access Token cookie (1 hour)
    res.cookie('accessToken', result.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: 60 * 60 * 1000 // 1 hour
    });

    // Refresh Token cookie (depends on user type, set in service)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      maxAge: result.user.rol === 'ADMIN' ? 60 * 60 * 1000 : 7 * 24 * 60 * 60 * 1000 // 1h for admin, 7d for others
    });

    // Send response without tokens (they're in cookies now)
    res.status(200).json(
      successResponse(
        { user: result.user },
        'Inicio de sesión exitoso'
      )
    );
  } catch (error) {
    if (error.message === 'INVALID_CREDENTIALS') {
      return res.status(401).json(
        errorResponse('Credenciales inválidas', 'INVALID_CREDENTIALS')
      );
    }
    next(error);
  }
};

/**
 * Refresh token endpoint
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    const result = await authService.refresh(refreshToken);

    res.status(200).json(
      successResponse(result, 'Token renovado exitosamente')
    );
  } catch (error) {
    if (error.message === 'INVALID_REFRESH_TOKEN') {
      return res.status(401).json(
        errorResponse('Refresh token inválido o expirado', 'INVALID_REFRESH_TOKEN')
      );
    }
    if (error.message === 'INVALID_SESSION') {
      return res.status(401).json(
        errorResponse('Sesión inválida o expirada', 'INVALID_SESSION')
      );
    }
    if (error.message === 'USER_NOT_FOUND') {
      return res.status(404).json(
        errorResponse('Usuario no encontrado', 'USER_NOT_FOUND')
      );
    }
    next(error);
  }
};

/**
 * Logout endpoint
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    // Get refresh token from cookie or body (backwards compatibility)
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (refreshToken) {
      await authService.logout(refreshToken);
    }

    // Clear cookies
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

    res.status(200).json(
      successResponse(null, 'Sesión cerrada exitosamente')
    );
  } catch (error) {
    next(error);
  }
};

module.exports = {
  login,
  refreshToken,
  logout
};
