const { createError } = require('./errorHandler');

function validate(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) return next(createError(422, error.details.map((d) => d.message).join('; ')));
    req.body = value;
    next();
  };
}

function validateQuery(schema) {
  return (req, _res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false, stripUnknown: true });
    if (error) return next(createError(422, error.details.map((d) => d.message).join('; ')));
    req.query = value;
    next();
  };
}

module.exports = { validate, validateQuery };
