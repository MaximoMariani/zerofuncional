const logger = require('../utils/logger');

function errorHandler(err, req, res, _next) {
  const status  = err.status || err.statusCode || 500;
  const message = (err.expose || status < 500) ? err.message : 'Internal server error';
  if (status >= 500) logger.error({ err, method: req.method, url: req.url }, 'Unhandled error');
  const body = { error: message };
  if (process.env.NODE_ENV !== 'production' && err.stack) body.stack = err.stack;
  return res.status(status).json(body);
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: `${req.method} ${req.path} not found` });
}

function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

function createError(status, message) {
  const err = new Error(message);
  err.status  = status;
  err.expose  = true;
  return err;
}

module.exports = { errorHandler, notFoundHandler, asyncHandler, createError };
