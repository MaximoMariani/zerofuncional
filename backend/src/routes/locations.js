const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validate');
const locationService = require('../services/locationService');

const router = express.Router();
router.use(authenticate);

const createLocationSchema = Joi.object({
  code: Joi.string().trim().uppercase().min(1).max(20).required(),
  zone: Joi.string().trim().max(50).optional().allow(''),
  description: Joi.string().trim().max(255).optional().allow(''),
});

const productLocationSchema = Joi.object({
  locationId: Joi.number().integer().required(),
  stock: Joi.number().integer().min(0).optional(),
});

// GET /api/locations
router.get('/', asyncHandler(async (_req, res) => {
  const locs = await locationService.listLocations({ activeOnly: false });
  return res.json(locs);
}));

// POST /api/locations  (admin only)
router.post('/', authorize('admin'), validate(createLocationSchema), asyncHandler(async (req, res) => {
  const loc = await locationService.createLocation(req.body);
  return res.status(201).json(loc);
}));

// GET /api/locations/sku/:sku
router.get('/sku/:sku', asyncHandler(async (req, res) => {
  const loc = await locationService.getLocationBySku(req.params.sku);
  return res.json(loc || null);
}));

// POST /api/products/:sku/location  (admin + operator)
router.post('/products/:sku/location',
  authorize('admin', 'operator'),
  validate(productLocationSchema),
  asyncHandler(async (req, res) => {
    const result = await locationService.setProductLocation({
      sku: req.params.sku,
      locationId: req.body.locationId,
      stock: req.body.stock,
    });
    return res.json(result);
  })
);

module.exports = router;
