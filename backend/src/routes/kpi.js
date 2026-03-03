const express = require('express');
const Joi = require('joi');
const { authenticate } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/errorHandler');
const { validateQuery } = require('../middleware/validate');
const kpi = require('../services/kpiService');

const router = express.Router();
router.use(authenticate);

const dateQuery = Joi.object({
  date: Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

// GET /api/kpi/today
router.get('/today', validateQuery(dateQuery), asyncHandler(async (req, res) => {
  const result = await kpi.getToday(req.query.date);
  return res.json(result);
}));

// GET /api/kpi/performance
router.get('/performance', validateQuery(dateQuery), asyncHandler(async (req, res) => {
  const result = await kpi.getPerformance(req.query.date);
  return res.json(result);
}));

// GET /api/kpi/operators
router.get('/operators', validateQuery(dateQuery), asyncHandler(async (req, res) => {
  const result = await kpi.getOperators(req.query.date);
  return res.json(result);
}));

// GET /api/kpi/errors
router.get('/errors', validateQuery(dateQuery), asyncHandler(async (req, res) => {
  const result = await kpi.getErrors(req.query.date);
  return res.json(result);
}));

module.exports = router;
