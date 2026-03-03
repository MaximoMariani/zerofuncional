const db = require('../db');
const logger = require('../utils/logger');

/**
 * Event Service
 *
 * Writes events to order_events table.
 * Events are immutable — never deleted or updated.
 *
 * EVENT TYPES:
 *   ORDER_OPENED       fired when first scan on a pending order starts it
 *   ITEM_SCANNED       fired on each successful scan
 *   ITEM_MISSING       fired when operator marks item as missing
 *   ITEM_REPLACED      fired when operator replaces an item
 *   SUPERVISOR_OVERRIDE fired when supervisor approves an exception
 *   ORDER_PACKED       fired when all items complete + packed
 *   ORDER_PARTIAL      fired when packed with at least one exception
 */

const VALID_EVENTS = [
  'ORDER_OPENED', 'ITEM_SCANNED', 'ITEM_MISSING',
  'ITEM_REPLACED', 'SUPERVISOR_OVERRIDE', 'ORDER_PACKED', 'ORDER_PARTIAL',
];

/**
 * Append an event. Accepts an optional Knex transaction (trx).
 */
async function emit({ orderId, itemId = null, userId = null, eventType, payload = null, notes = null, trx = null }) {
  if (!VALID_EVENTS.includes(eventType)) {
    logger.warn({ eventType }, 'Unknown event type, skipping');
    return;
  }
  try {
    const q = trx ? trx('order_events') : db('order_events');
    await q.insert({
      order_id: orderId,
      order_item_id: itemId ?? null,
      user_id: userId,
      event_type: eventType,
      payload: payload ? JSON.stringify(payload) : null,
      notes: notes ?? null,
    });
  } catch (err) {
    logger.error({ err, orderId, eventType }, 'Failed to emit order event');
  }
}

/**
 * Get all events for an order, newest first.
 */
async function getByOrder(orderId) {
  return db('order_events as e')
    .leftJoin('users as u', 'e.user_id', 'u.id')
    .leftJoin('order_items as oi', 'e.order_item_id', 'oi.id')
    .select(
      'e.id', 'e.event_type', 'e.payload', 'e.notes', 'e.occurred_at',
      'u.name as user_name',
      'oi.sku as item_sku', 'oi.name as item_name'
    )
    .where('e.order_id', orderId)
    .orderBy('e.occurred_at', 'asc');
}

module.exports = { emit, getByOrder, VALID_EVENTS };
