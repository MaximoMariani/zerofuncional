const { createError } = require('./errorHandler');

/**
 * Validate req.body against a Joi schema.
 * Returns 422 with field-level errors on failure.
 */
function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(createError(422, message));
    }
    req.body = value; // use stripped+coerced value
    next();
  };
}

/**
 * Validate req.query against a Joi schema.
 */
function validateQuery(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const message = error.details.map((d) => d.message).join('; ');
      return next(createError(422, message));
    }
    req.query = value;
    next();
  };
}

module.exports = { validate, validateQuery };
