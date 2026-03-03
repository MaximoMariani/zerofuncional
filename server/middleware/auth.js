const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

/**
 * Verifies the Bearer access token.
 * Attaches req.user = { id, email, role }
 */
function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(createError(401, 'Missing or invalid authorization header'));
  }

  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') return next(createError(401, 'Access token expired'));
    return next(createError(401, 'Invalid access token'));
  }
}

/**
 * Role-based authorization.
 * Usage: authorize('admin') or authorize('admin', 'operator')
 */
function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(createError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) {
      return next(createError(403, 'Insufficient permissions'));
    }
    next();
  };
}

module.exports = { authenticate, authorize };
