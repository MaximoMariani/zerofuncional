const express = require('express');
const Joi = require('joi');
const rateLimit = require('express-rate-limit');
const { authenticate } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const auth = require('../services/authService');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  message: { error: 'Too many auth attempts, try again later' },
});

const loginSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const registerSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role:     Joi.string().valid('admin', 'operator').default('operator'),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const data = await auth.login(req.body.email, req.body.password);
  return res.json(data);
}));

// POST /api/auth/register — first run (no users yet) OR admin only
router.post('/register', authLimiter, validate(registerSchema), asyncHandler(async (req, res) => {
  const firstRun = await auth.isFirstRun();
  if (!firstRun) {
    // Require admin token for subsequent registrations
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Admin token required' });
    const jwt = require('jsonwebtoken');
    let payload;
    try { payload = jwt.verify(header.slice(7), process.env.JWT_ACCESS_SECRET); }
    catch { return res.status(401).json({ error: 'Invalid token' }); }
    if (payload.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  }
  const user = await auth.register(req.body.email, req.body.password, req.body.role);
  return res.status(201).json(user);
}));

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), asyncHandler(async (req, res) => {
  const tokens = await auth.refresh(req.body.refreshToken);
  return res.json(tokens);
}));

// POST /api/auth/logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await auth.logout(req.user.id);
  return res.json({ ok: true });
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  return res.json(req.user);
}));

module.exports = router;
