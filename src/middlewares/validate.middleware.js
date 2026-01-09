const { errorResponse } = require('../utils/response.util');

/**
 * Validation middleware using Joi schemas
 * @param {Object} schema - Joi validation schema
 * @param {string} property - Property to validate ('body', 'params', 'query')
 */
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const details = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json(
        errorResponse('Error de validación', 'VALIDATION_ERROR', details)
      );
    }

    // Replace request property with validated value
    req[property] = value;
    next();
  };
};

module.exports = validate;
