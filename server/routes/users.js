const express = require('express');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validate');
const db = require('../db');
const { audit } = require('../services/auditService');

const router = express.Router();
router.use(authenticate);

const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(8).max(128).required(),
  role: Joi.string().valid('admin', 'operator', 'viewer').default('operator'),
});

const updateUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).optional(),
  role: Joi.string().valid('admin', 'operator', 'viewer').optional(),
  active: Joi.boolean().optional(),
  password: Joi.string().min(8).max(128).optional(),
});

// GET /api/users  (admin only)
router.get('/', authorize('admin'), asyncHandler(async (_req, res) => {
  const users = await db('users').select('id', 'name', 'email', 'role', 'active', 'created_at');
  return res.json(users);
}));

// POST /api/users  (admin only)
router.post('/', authorize('admin'), validate(createUserSchema), asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;
  const exists = await db('users').where({ email: email.toLowerCase() }).first();
  if (exists) throw createError(409, 'Email already registered');

  const password_hash = await bcrypt.hash(password, 10);
  const [id] = await db('users').insert({ name, email: email.toLowerCase(), password_hash, role });

  await audit({ userId: req.user.id, action: 'user.created', entityType: 'user', entityId: id, ipAddress: req.ip });
  return res.status(201).json({ id, name, email, role });
}));

// PATCH /api/users/:id  (admin only)
router.patch('/:id', authorize('admin'), validate(updateUserSchema), asyncHandler(async (req, res) => {
  const targetId = Number(req.params.id);
  const user = await db('users').where({ id: targetId }).first();
  if (!user) throw createError(404, 'User not found');

  const updates = {};
  if (req.body.name) updates.name = req.body.name;
  if (req.body.role) updates.role = req.body.role;
  if (typeof req.body.active === 'boolean') updates.active = req.body.active;
  if (req.body.password) updates.password_hash = await bcrypt.hash(req.body.password, 10);

  await db('users').where({ id: targetId }).update(updates);
  await audit({ userId: req.user.id, action: 'user.updated', entityType: 'user', entityId: targetId, ipAddress: req.ip });
  return res.json({ message: 'User updated' });
}));

module.exports = router;
