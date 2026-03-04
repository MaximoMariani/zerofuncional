const jwt = require('jsonwebtoken');
const { createError } = require('./errorHandler');

function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return next(createError(401, 'Missing authorization header'));
  const token = header.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    next(createError(401, err.name === 'TokenExpiredError' ? 'Token expired' : 'Invalid token'));
  }
}

function authorize(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(createError(401, 'Not authenticated'));
    if (!roles.includes(req.user.role)) return next(createError(403, 'Forbidden'));
    next();
  };
}

module.exports = { authenticate, authorize };
