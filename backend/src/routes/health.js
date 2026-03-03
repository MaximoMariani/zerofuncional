const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', async (_req, res) => {
  let dbOk = false;
  try {
    await db.raw('SELECT 1');
    dbOk = true;
  } catch (_err) {
    // db unreachable
  }

  const status = dbOk ? 200 : 503;
  return res.status(status).json({
    status: dbOk ? 'ok' : 'degraded',
    db: dbOk ? 'ok' : 'error',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

module.exports = router;
