const db = require('../db');
const { createError } = require('../middleware/errorHandler');
const { audit } = require('./auditService');
const { emit } = require('./eventService');
const { getLocationsBySkus } = require('./locationService');

/**
 * List orders with pagination.
 */
async function list({ page = 1, limit = 20, status, assignedTo } = {}) {
  const offset = (page - 1) * limit;

  let q = db('orders as o')
    .leftJoin('users as u', 'o.assigned_to', 'u.id')
    .select(
      'o.id', 'o.external_id', 'o.customer_name', 'o.customer_email',
      'o.status', 'o.notes', 'o.created_at', 'o.updated_at',
      'u.name as assigned_to_name'
    )
    .orderBy('o.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  if (status) q = q.where('o.status', status);
  if (assignedTo) q = q.where('o.assigned_to', assignedTo);

  const countQ = db('orders');
  if (status) countQ.where('status', status);
  const [{ total }] = await countQ.count('id as total');
  const rows = await q;

  // Avoid N+1: attach item summary + exception counts
  const orderIds = rows.map((r) => r.id);
  const itemSummaries = orderIds.length > 0
    ? await db('order_items')
        .whereIn('order_id', orderIds)
        .select('order_id')
        .count('id as total_items')
        .sum('quantity as total_qty')
        .sum('scanned_qty as scanned_qty')
        .count(db.raw('CASE WHEN exception_status IS NOT NULL THEN 1 END as exceptions'))
        .groupBy('order_id')
    : [];

  const summaryMap = Object.fromEntries(itemSummaries.map((s) => [s.order_id, s]));

  const data = rows.map((r) => ({
    ...r,
    total_items: Number(summaryMap[r.id]?.total_items ?? 0),
    total_qty: Number(summaryMap[r.id]?.total_qty ?? 0),
    scanned_qty: Number(summaryMap[r.id]?.scanned_qty ?? 0),
    exceptions: Number(summaryMap[r.id]?.exceptions ?? 0),
  }));

  return {
    data,
    pagination: { page, limit, total: Number(total), pages: Math.ceil(total / limit) },
  };
}

/**
 * Get a single order with all items + warehouse locations.
 */
async function getById(orderId) {
  const order = await db('orders as o')
    .leftJoin('users as u', 'o.assigned_to', 'u.id')
    .select('o.*', 'u.name as assigned_to_name')
    .where('o.id', orderId)
    .first();

  if (!order) throw createError(404, 'Order not found');

  const items = await db('order_items').where({ order_id: orderId }).orderBy('id');

  // Attach warehouse locations (one query for all skus)
  const skus = [...new Set(items.map((i) => i.sku))];
  const locationMap = await getLocationsBySkus(skus);

  const itemsWithLocation = items.map((item) => ({
    ...item,
    location: locationMap[item.sku] || null,
  }));

  return { ...order, items: itemsWithLocation };
}

/**
 * Mark an order as packed.
 * Allows packing with exceptions (missing/replaced items) — fires ORDER_PARTIAL.
 * Full pack → ORDER_PACKED.
 *
 * NOTE FOR TIENDANUBE INTEGRATION:
 * After updating local status, call TiendanubeClient.markPacked(order.external_id)
 * if INTEGRATION_PROVIDER === 'tiendanube'.
 * See /src/integrations/tiendanube/client.js
 */
async function markPacked(orderId, userId, ipAddress) {
  return db.transaction(async (trx) => {
    const order = await trx('orders').where({ id: orderId }).first();
    if (!order) throw createError(404, 'Order not found');
    if (order.status === 'packed') throw createError(409, 'Order is already packed');
    if (order.status === 'cancelled') throw createError(409, 'Cannot pack a cancelled order');

    // Items that are neither complete nor have an exception are truly blocking
    const blockingItems = await trx('order_items')
      .where({ order_id: orderId })
      .whereNot('status', 'complete')
      .whereNull('exception_status');

    if (blockingItems.length > 0) {
      throw createError(422, `Order has ${blockingItems.length} item(s) not yet scanned or marked as exception`);
    }

    // Determine if partial (has any exception items)
    const exceptionItems = await trx('order_items')
      .where({ order_id: orderId })
      .whereNotNull('exception_status');

    const isPartial = exceptionItems.length > 0;
    const eventType = isPartial ? 'ORDER_PARTIAL' : 'ORDER_PACKED';

    await trx('orders').where({ id: orderId }).update({ status: 'packed', updated_at: db.fn.now() });

    await emit({
      orderId,
      userId,
      eventType,
      payload: { exceptions: exceptionItems.length, previous_status: order.status },
      trx,
    });

    await audit({
      userId,
      action: 'order.packed',
      entityType: 'order',
      entityId: orderId,
      metadata: { previous_status: order.status, partial: isPartial, exceptions: exceptionItems.length },
      ipAddress,
      trx,
    });

    return { ...order, status: 'packed', partial: isPartial };
  });
}

/**
 * Mark an item as missing.
 */
async function markItemMissing(orderId, itemId, userId, notes, ipAddress) {
  return db.transaction(async (trx) => {
    const item = await trx('order_items').where({ id: itemId, order_id: orderId }).first();
    if (!item) throw createError(404, 'Item not found in this order');
    if (item.exception_status) throw createError(409, `Item already has exception: ${item.exception_status}`);

    await trx('order_items').where({ id: itemId }).update({
      exception_status: 'missing',
      exception_note: notes || null,
      status: 'complete', // treated as resolved for packing purposes
      updated_at: db.fn.now(),
    });

    await emit({
      orderId,
      itemId,
      userId,
      eventType: 'ITEM_MISSING',
      payload: { sku: item.sku, name: item.name },
      notes: notes || null,
      trx,
    });

    await audit({
      userId,
      action: 'item.missing',
      entityType: 'order',
      entityId: orderId,
      metadata: { item_id: itemId, sku: item.sku },
      ipAddress,
      trx,
    });

    return { ...item, exception_status: 'missing', exception_note: notes || null };
  });
}

/**
 * Replace an item with a different SKU.
 */
async function replaceItem(orderId, itemId, userId, { replacementSku, notes }, ipAddress) {
  return db.transaction(async (trx) => {
    const item = await trx('order_items').where({ id: itemId, order_id: orderId }).first();
    if (!item) throw createError(404, 'Item not found in this order');
    if (item.exception_status) throw createError(409, `Item already has exception: ${item.exception_status}`);

    await trx('order_items').where({ id: itemId }).update({
      exception_status: 'replaced',
      replacement_sku: replacementSku,
      exception_note: notes || null,
      status: 'complete',
      updated_at: db.fn.now(),
    });

    await emit({
      orderId,
      itemId,
      userId,
      eventType: 'ITEM_REPLACED',
      payload: { original_sku: item.sku, replacement_sku: replacementSku },
      notes: notes || null,
      trx,
    });

    await audit({
      userId,
      action: 'item.replaced',
      entityType: 'order',
      entityId: orderId,
      metadata: { item_id: itemId, original_sku: item.sku, replacement_sku: replacementSku },
      ipAddress,
      trx,
    });

    return { ...item, exception_status: 'replaced', replacement_sku: replacementSku };
  });
}

/**
 * Supervisor override — approve all pending exceptions on an order.
 */
async function supervisorOverride(orderId, userId, notes, ipAddress) {
  return db.transaction(async (trx) => {
    const order = await trx('orders').where({ id: orderId }).first();
    if (!order) throw createError(404, 'Order not found');

    await emit({
      orderId,
      userId,
      eventType: 'SUPERVISOR_OVERRIDE',
      payload: { order_status: order.status },
      notes: notes || null,
      trx,
    });

    await audit({
      userId,
      action: 'order.supervisor_override',
      entityType: 'order',
      entityId: orderId,
      metadata: { notes },
      ipAddress,
      trx,
    });

    return { orderId, approved: true };
  });
}

module.exports = { list, getById, markPacked, markItemMissing, replaceItem, supervisorOverride };
