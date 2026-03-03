const express = require('express');
const rateLimit = require('express-rate-limit');
const Joi = require('joi');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const authService = require('../services/authService');
const { audit } = require('../services/auditService');

const router = express.Router();

// Stricter rate limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_RATE_LIMIT_MAX) || 20,
  message: { error: 'Too many login attempts, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(128).required(),
});

const refreshSchema = Joi.object({
  refreshToken: Joi.string().required(),
});

// POST /api/auth/login
router.post('/login', authLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password);

  await audit({
    userId: result.user.id,
    action: 'auth.login',
    entityType: 'user',
    entityId: result.user.id,
    ipAddress: req.ip,
  });

  return res.json(result);
}));

// POST /api/auth/refresh
router.post('/refresh', validate(refreshSchema), asyncHandler(async (req, res) => {
  const tokens = await authService.refresh(req.body.refreshToken);
  return res.json(tokens);
}));

// POST /api/auth/logout
router.post('/logout', authenticate, asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  await audit({ userId: req.user.id, action: 'auth.logout', ipAddress: req.ip });
  return res.json({ message: 'Logged out' });
}));

// GET /api/auth/me
router.get('/me', authenticate, asyncHandler(async (req, res) => {
  return res.json({ user: req.user });
}));

module.exports = router;
