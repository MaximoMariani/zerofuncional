const tn = require('../integrations/tiendanube/client');
const { upsertFromTN } = require('./orderService');
const db = require('../db');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Pull last N orders from Tiendanube and upsert into local DB.
 * Returns { synced, errors }
 */
async function syncOrders({ pages = 2 } = {}) {
  const results = { synced: 0, errors: 0, order_ids: [] };

  for (let page = 1; page <= pages; page++) {
    let orders;
    try {
      orders = await tn.fetchOrders({ limit: 50, page });
    } catch (err) {
      logger.error({ err }, `TN sync fetch failed on page ${page}`);
      results.errors++;
      break;
    }

    if (!orders || orders.length === 0) break;

    for (const o of orders) {
      try {
        const id = await upsertFromTN(o);
        results.order_ids.push(id);
        results.synced++;
      } catch (err) {
        logger.error({ err, tn_order_id: o.id }, 'Failed to upsert TN order');
        results.errors++;
      }
    }

    if (orders.length < 50) break; // last page
  }

  await db('store_config').where({ id: 1 }).update({ last_sync_at: new Date() });
  logger.info(results, 'TN sync complete');
  return results;
}

/**
 * Verify Tiendanube webhook signature.
 * TN sends: X-Linkedstore-App-Id and the body as raw bytes.
 * If TIENDANUBE_WEBHOOK_SECRET is set we verify; otherwise we skip.
 */
function verifyWebhookSignature(rawBody, headers) {
  const secret = process.env.TIENDANUBE_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured — allow all (dev mode)

  // TN signs with HMAC-SHA256 of the raw body using the app's client secret
  const sig = headers['x-linkedstore-hmac-sha256'] || headers['x-tiendanube-hmac-sha256'];
  if (!sig) {
    logger.warn('Webhook received without signature header');
    return false;
  }

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

/**
 * Handle an inbound webhook payload from Tiendanube.
 */
async function handleWebhook(event, payload, rawBody, headers) {
  if (!verifyWebhookSignature(rawBody, headers)) {
    throw Object.assign(new Error('Invalid webhook signature'), { status: 401 });
  }

  logger.info({ event }, 'TN webhook received');

  // Supported events: order/created, order/updated, order/paid, order/packed, order/cancelled
  if (event && event.startsWith('order/')) {
    const tnOrderId = payload?.id;
    if (!tnOrderId) return { ignored: true };

    try {
      // Fetch fresh from TN API and upsert
      const fullOrder = await tn.fetchOrder(tnOrderId);
      const orderId = await upsertFromTN(fullOrder);

      // Override status based on event
      if (event === 'order/cancelled') {
        await db('orders').where({ id: orderId }).update({ status: 'cancelled', updated_at: new Date() });
      }

      await db('order_events').insert({
        order_id: orderId,
        type: 'WEBHOOK_UPDATE',
        meta: JSON.stringify({ event, tn_order_id: tnOrderId }),
      });

      return { processed: true, order_id: orderId };
    } catch (err) {
      logger.error({ err, tnOrderId, event }, 'Webhook order processing failed');
      throw err;
    }
  }

  return { ignored: true, event };
}

module.exports = { syncOrders, handleWebhook, verifyWebhookSignature };
