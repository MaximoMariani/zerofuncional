const express = require('express');
const Joi = require('joi');
const bcrypt = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const db = require('../db');

const router = express.Router();
router.use(authenticate, authorize('admin'));

const createSchema = Joi.object({
  email:    Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  role:     Joi.string().valid('admin', 'operator').default('operator'),
});

const updateSchema = Joi.object({
  password: Joi.string().min(8).optional(),
  role:     Joi.string().valid('admin', 'operator').optional(),
  active:   Joi.boolean().optional(),
});

// GET /api/users
router.get('/', asyncHandler(async (_req, res) => {
  const users = await db('users').select('id', 'email', 'role', 'active', 'created_at').orderBy('created_at');
  return res.json(users);
}));

// POST /api/users
router.post('/', validate(createSchema), asyncHandler(async (req, res) => {
  const { email, password, role } = req.body;
  const exists = await db('users').where({ email: email.toLowerCase() }).first();
  if (exists) throw createError(409, 'Email already registered');
  const hash = await bcrypt.hash(password, 10);
  const [user] = await db('users').insert({ email: email.toLowerCase(), password_hash: hash, role }).returning(['id', 'email', 'role', 'active']);
  return res.status(201).json(user);
}));

// PATCH /api/users/:id
router.patch('/:id', validate(updateSchema), asyncHandler(async (req, res) => {
  const { password, role, active } = req.body;
  const updates = {};
  if (password) updates.password_hash = await bcrypt.hash(password, 10);
  if (role !== undefined) updates.role = role;
  if (active !== undefined) updates.active = active;
  if (!Object.keys(updates).length) throw createError(400, 'No fields to update');
  await db('users').where({ id: req.params.id }).update({ ...updates, updated_at: new Date() });
  const user = await db('users').where({ id: req.params.id }).select('id', 'email', 'role', 'active').first();
  return res.json(user);
}));

module.exports = router;
