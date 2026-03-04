const express = require('express');
const router = express.Router();

// ── Healthcheck ─────────────────────────────────────────────────
// MUST respond 200 immediately — no DB calls, no async, no dependencies.
// Railway probes this path right after process start. Any delay or 5xx
// here causes "1/1 replicas never became healthy".
//
// DB health is checked separately at /health/full (authenticated, internal).
router.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: Math.floor(process.uptime()),
    ts: Date.now(),
  });
});

// Detailed check for internal monitoring (not used by Railway healthcheck)
router.get('/full', async (_req, res) => {
  const db = require('../db');
  try {
    await db.raw('SELECT 1');
    return res.json({ status: 'ok', db: 'ok', uptime: Math.floor(process.uptime()) });
  } catch (err) {
    return res.status(503).json({ status: 'error', db: 'unreachable', detail: err.message });
  }
});

module.exports = router;
