const express = require('express');
const db = require('../db');
const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    await db.raw('SELECT 1');
    return res.json({ status: 'ok', db: 'ok', uptime: Math.floor(process.uptime()) });
  } catch {
    return res.status(503).json({ status: 'error', db: 'unreachable' });
  }
});

module.exports = router;
