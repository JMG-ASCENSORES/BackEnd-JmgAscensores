/**
 * Success response formatter
 * @param {*} data - Response data
 * @param {string} message - Success message
 * @returns {Object} - Formatted success response
 */
const successResponse = (data = null, message = 'Operación realizada exitosamente', meta = undefined) => {
  const res = {
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  };
  if (meta) { res.meta = meta; }
  return res;
};

/**
 * Error response formatter
 * @param {string} message - Error message
 * @param {string} error - Error code
 * @param {*} details - Additional error details
 * @returns {Object} - Formatted error response
 */
const errorResponse = (message = 'Ha ocurrido un error', error = 'ERROR', details = null) => {
  return {
    success: false,
    message,
    error,
    details,
    timestamp: new Date().toISOString()
  };
};

module.exports = {
  successResponse,
  errorResponse
};
