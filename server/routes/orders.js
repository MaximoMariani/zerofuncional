const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateQuery, validate } = require('../middleware/validate');
const orderService = require('../services/orderService');
const { getByOrder } = require('../services/eventService');

const router = express.Router();
router.use(authenticate);

const listQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  status: Joi.string().valid('pending', 'in_progress', 'packed', 'cancelled').optional(),
  assignedTo: Joi.number().integer().optional(),
});

const missingSchema = Joi.object({
  notes: Joi.string().trim().max(500).optional().allow(''),
});

const replaceSchema = Joi.object({
  replacementSku: Joi.string().trim().max(100).required(),
  notes: Joi.string().trim().max(500).optional().allow(''),
});

const overrideSchema = Joi.object({
  notes: Joi.string().trim().max(500).optional().allow(''),
});

// GET /api/orders
router.get('/', validateQuery(listQuerySchema), asyncHandler(async (req, res) => {
  const result = await orderService.list(req.query);
  return res.json(result);
}));

// GET /api/orders/:id
router.get('/:id', asyncHandler(async (req, res) => {
  const order = await orderService.getById(Number(req.params.id));
  return res.json(order);
}));

// GET /api/orders/:id/events
router.get('/:id/events', asyncHandler(async (req, res) => {
  const events = await getByOrder(Number(req.params.id));
  return res.json(events);
}));

// PATCH /api/orders/:id/pack
// NOTE FOR TIENDANUBE: after packing locally, call TiendanubeClient.markPacked()
// See src/services/orderService.js → markPacked() and src/integrations/tiendanube/
router.patch('/:id/pack', authorize('admin', 'operator'), asyncHandler(async (req, res) => {
  const order = await orderService.markPacked(Number(req.params.id), req.user.id, req.ip);
  return res.json(order);
}));

// POST /api/orders/:orderId/items/:itemId/missing
router.post('/:orderId/items/:itemId/missing',
  authorize('admin', 'operator'),
  validate(missingSchema),
  asyncHandler(async (req, res) => {
    const result = await orderService.markItemMissing(
      Number(req.params.orderId),
      Number(req.params.itemId),
      req.user.id,
      req.body.notes,
      req.ip
    );
    return res.json(result);
  })
);

// POST /api/orders/:orderId/items/:itemId/replace
router.post('/:orderId/items/:itemId/replace',
  authorize('admin', 'operator'),
  validate(replaceSchema),
  asyncHandler(async (req, res) => {
    const result = await orderService.replaceItem(
      Number(req.params.orderId),
      Number(req.params.itemId),
      req.user.id,
      req.body,
      req.ip
    );
    return res.json(result);
  })
);

// POST /api/orders/:id/supervisor-override
router.post('/:id/supervisor-override',
  authorize('admin'),
  validate(overrideSchema),
  asyncHandler(async (req, res) => {
    const result = await orderService.supervisorOverride(
      Number(req.params.id),
      req.user.id,
      req.body.notes,
      req.ip
    );
    return res.json(result);
  })
);

module.exports = router;
