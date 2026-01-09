const { errorResponse } = require('../utils/response.util');

/**
 * Global error handler middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // Sequelize validation error
  if (err.name === 'SequelizeValidationError') {
    const details = err.errors.map(e => ({
      field: e.path,
      message: e.message
    }));
    return res.status(400).json(
      errorResponse('Error de validación de datos', 'VALIDATION_ERROR', details)
    );
  }

  // Sequelize unique constraint error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0]?.path || 'campo';
    return res.status(409).json(
      errorResponse(`El ${field} ya existe en el sistema`, 'DUPLICATE_ERROR')
    );
  }

  // Sequelize foreign key constraint error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json(
      errorResponse('Error de integridad referencial', 'FOREIGN_KEY_ERROR')
    );
  }

  // Default error
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Error interno del servidor';
  const errorCode = err.code || 'INTERNAL_ERROR';

  res.status(statusCode).json(
    errorResponse(message, errorCode, process.env.NODE_ENV === 'development' ? err.stack : null)
  );
};

module.exports = errorHandler;
