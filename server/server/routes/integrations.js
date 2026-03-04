const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');
const { asyncHandler, createError } = require('../middleware/errorHandler');
const tn = require('../integrations/tiendanube/client');
const { syncOrders, handleWebhook } = require('../services/syncService');
const logger = require('../utils/logger');

const router = express.Router();

// ── Status ─────────────────────────────────────────────────────
// GET /api/integrations/tiendanube/status
router.get('/tiendanube/status', authenticate, asyncHandler(async (_req, res) => {
  const status = await tn.getStatus();
  return res.json(status);
}));

// ── OAuth: start ───────────────────────────────────────────────
// GET /api/integrations/tiendanube/auth/start
router.get('/tiendanube/auth/start', authenticate, authorize('admin'), asyncHandler(async (req, res) => {
  if (!process.env.TIENDANUBE_CLIENT_ID) throw createError(503, 'TIENDANUBE_CLIENT_ID not configured');
  const state = Buffer.from(String(req.user.id)).toString('base64');
  const url = tn.getAuthUrl(state);
  return res.redirect(url);
}));

// ── OAuth: callback ────────────────────────────────────────────
// GET /api/integrations/tiendanube/auth/callback
router.get('/tiendanube/auth/callback', asyncHandler(async (req, res) => {
  const { code, error } = req.query;

  if (error) {
    logger.warn({ error }, 'TN OAuth error');
    return res.redirect(`/admin/integrations/tiendanube?error=${encodeURIComponent(error)}`);
  }

  if (!code) return res.redirect('/admin/integrations/tiendanube?error=missing_code');

  try {
    const tokenData = await tn.exchangeCode(code);
    // Fetch store name
    let storeName = null;
    try {
      await tn.saveTokens({ access_token: tokenData.access_token, user_id: tokenData.user_id });
      const storeInfo = await tn.getStoreInfo();
      storeName = storeInfo?.name || null;
    } catch {}
    await tn.saveTokens({ access_token: tokenData.access_token, user_id: tokenData.user_id, storeName });
    logger.info({ user_id: tokenData.user_id }, 'TN OAuth connected');
    return res.redirect('/admin/integrations/tiendanube?connected=1');
  } catch (err) {
    logger.error({ err }, 'TN OAuth callback failed');
    return res.redirect(`/admin/integrations/tiendanube?error=${encodeURIComponent(err.message)}`);
  }
}));

// ── Sync ───────────────────────────────────────────────────────
// POST /api/integrations/tiendanube/sync
router.post('/tiendanube/sync', authenticate, authorize('admin'), asyncHandler(async (_req, res) => {
  const provider = process.env.INTEGRATION_PROVIDER || 'local';
  if (provider !== 'tiendanube') throw createError(400, 'INTEGRATION_PROVIDER is not tiendanube');
  const result = await syncOrders({ pages: 4 }); // ~200 orders
  return res.json(result);
}));

// ── Webhook ────────────────────────────────────────────────────
// POST /api/integrations/tiendanube/webhook
// Must parse raw body for signature verification — Express body-parser must NOT parse this route first.
router.post('/tiendanube/webhook', express.raw({ type: '*/*' }), asyncHandler(async (req, res) => {
  const event   = req.headers['x-tiendanube-topic'] || req.headers['x-linkedstore-topic'] || '';
  const rawBody = req.body; // Buffer (because express.raw)
  let payload;
  try {
    payload = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  const result = await handleWebhook(event, payload, rawBody, req.headers);
  return res.json({ ok: true, ...result });
}));

module.exports = router;
