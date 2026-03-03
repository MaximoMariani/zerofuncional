const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validate } = require('../middleware/validate');
const scanService = require('../services/scanService');

const router = express.Router();

router.use(authenticate);

const scanSchema = Joi.object({
  orderId: Joi.number().integer().required(),
  barcode: Joi.string().trim().min(1).max(100).required(),
});

// POST /api/scans
router.post('/', authorize('admin', 'operator'), validate(scanSchema), asyncHandler(async (req, res) => {
  const result = await scanService.processScan({
    orderId: req.body.orderId,
    barcode: req.body.barcode,
    userId: req.user.id,
    ipAddress: req.ip,
  });
  return res.json(result);
}));

module.exports = router;
