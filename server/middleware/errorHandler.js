const logger = require('../utils/logger');

/**
 * Centralized error handler.
 * Always returns JSON with { error, ...(dev ? stack : {}) }.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || err.statusCode || 500;
  const message = err.expose || status < 500 ? err.message : 'Internal server error';

  if (status >= 500) {
    logger.error({ err, req: { method: req.method, url: req.url } }, 'Unhandled error');
  }

  const body = { error: message };
  if (process.env.NODE_ENV === 'development' && err.stack) {
    body.stack = err.stack;
  }

  return res.status(status).json(body);
}

function notFoundHandler(req, res) {
  return res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
}

/**
 * Wrap async route handlers to forward errors to errorHandler.
 */
function asyncHandler(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Create an HTTP error with a given status.
 */
function createError(status, message) {
  const err = new Error(message);
  err.status = status;
  err.expose = true;
  return err;
}

module.exports = { errorHandler, notFoundHandler, asyncHandler, createError };
