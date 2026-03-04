const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth');
const { validate, validateQuery } = require('../middleware/validate');
const { asyncHandler } = require('../middleware/errorHandler');
const orders = require('../services/orderService');

const router = express.Router();
router.use(authenticate);

const listQuerySchema = Joi.object({
  status: Joi.string().valid('pending', 'packed', 'cancelled').optional(),
  search: Joi.string().max(100).optional().allow(''),
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(30),
});

const scanSchema = Joi.object({
  code: Joi.string().trim().min(1).max(255).required(),
});

// GET /api/orders
router.get('/', validateQuery(listQuerySchema), asyncHandler(async (req, res) => {
  const result = await orders.list(req.query);
  return res.json(result);
}));

// GET /api/orders/by-number/:number  — MUST be before /:id
router.get('/by-number/:number', asyncHandler(async (req, res) => {
  const order = await orders.getByNumber(req.params.number);
  return res.json(order);
}));

// GET /api/orders/by-label/:labelCode
router.get('/by-label/:labelCode', asyncHandler(async (req, res) => {
  const order = await orders.getByLabel(req.params.labelCode);
  return res.json(order);
}));

// GET /api/orders/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await orders.getById(Number(req.params.id));
  return res.json(order);
}));

// POST /api/orders/:id/scan-item
router.post('/:id/scan-item', validate(scanSchema), asyncHandler(async (req, res) => {
  const result = await orders.scanItem(Number(req.params.id), req.body.code, req.user.id);
  return res.json(result);
}));

// POST /api/orders/:id/pack  (admin override)
router.post('/:id/pack', authorize('admin'), asyncHandler(async (req, res) => {
  const result = await orders.packOrder(Number(req.params.id), req.user.id);
  return res.json(result);
}));

module.exports = router;
