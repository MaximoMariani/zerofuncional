const express = require('express');
const Joi = require('joi');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateQuery } = require('../middleware/validate');
const auditService = require('../services/auditService');

const router = express.Router();
router.use(authenticate);
router.use(authorize('admin'));

const querySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(200).default(50),
  userId: Joi.number().integer().optional(),
  action: Joi.string().max(100).optional(),
  entityType: Joi.string().max(50).optional(),
  entityId: Joi.number().integer().optional(),
});

// GET /api/audit
router.get('/', validateQuery(querySchema), asyncHandler(async (req, res) => {
  const result = await auditService.list(req.query);
  return res.json(result);
}));

module.exports = router;
