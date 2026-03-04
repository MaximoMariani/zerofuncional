const db = require('../db');
const { createError } = require('../middleware/errorHandler');
const logger = require('../utils/logger');

// ── Helpers ────────────────────────────────────────────────────
function withItemProgress(orders, itemSummaries) {
  const map = Object.fromEntries(itemSummaries.map((s) => [s.order_id, s]));
  return orders.map((o) => ({
    ...o,
    total_qty:   Number(map[o.id]?.total_qty   ?? 0),
    scanned_qty: Number(map[o.id]?.scanned_qty ?? 0),
    total_items: Number(map[o.id]?.total_items ?? 0),
  }));
}

async function attachProgress(orderIds) {
  if (!orderIds.length) return [];
  return db('order_items')
    .whereIn('order_id', orderIds)
    .select('order_id')
    .sum('qty as total_qty')
    .sum('scanned_qty as scanned_qty')
    .count('id as total_items')
    .groupBy('order_id');
}

// ── List ───────────────────────────────────────────────────────
async function list({ status, search, page = 1, limit = 30 } = {}) {
  const offset = (page - 1) * limit;
  let q = db('orders').orderBy('created_at', 'desc').limit(limit).offset(offset);
  if (status) q = q.where('status', status);
  if (search) {
    q = q.where((b) =>
      b.whereILike('tn_order_number', `%${search}%`)
       .orWhereILike('customer_name', `%${search}%`)
       .orWhereILike('shipping_label_code', `%${search}%`)
    );
  }
  const countQ = db('orders');
  if (status) countQ.where('status', status);
  if (search) {
    countQ.where((b) =>
      b.whereILike('tn_order_number', `%${search}%`)
       .orWhereILike('customer_name', `%${search}%`)
       .orWhereILike('shipping_label_code', `%${search}%`)
    );
  }

  const [rows, [{ count }]] = await Promise.all([q, countQ.count('id as count')]);
  const summaries = await attachProgress(rows.map((r) => r.id));
  return {
    data: withItemProgress(rows, summaries),
    pagination: { page, limit, total: Number(count), pages: Math.ceil(count / limit) },
  };
}

// ── Get by id / number / label ─────────────────────────────────
async function getById(id) {
  const order = await db('orders').where({ id }).first();
  if (!order) throw createError(404, 'Order not found');
  const items = await db('order_items').where({ order_id: id }).orderBy('id');
  const [summary] = await attachProgress([id]);
  const scans = await db('scan_events').where({ order_id: id }).orderBy('created_at', 'desc').limit(50);
  return { ...order, items, scans, ...summary };
}

async function getByNumber(tn_order_number) {
  const order = await db('orders').where({ tn_order_number }).first();
  if (!order) throw createError(404, `Order #${tn_order_number} not found`);
  return getById(order.id);
}

async function getByLabel(labelCode) {
  const order = await db('orders')
    .whereILike('shipping_label_code', labelCode.trim())
    .first();
  if (!order) throw createError(404, `No order with label code "${labelCode}"`);
  return getById(order.id);
}

// ── Scan item ──────────────────────────────────────────────────
async function scanItem(orderId, scannedCode, userId) {
  return db.transaction(async (trx) => {
    const order = await trx('orders').where({ id: orderId }).first();
    if (!order) throw createError(404, 'Order not found');
    if (order.status === 'packed') throw createError(409, 'Order is already packed');
    if (order.status === 'cancelled') throw createError(409, 'Order is cancelled');

    const code = scannedCode.trim();

    // Match by barcode first, then by sku
    const item = await trx('order_items')
      .where({ order_id: orderId })
      .where((b) => b.where('barcode', code).orWhere('sku', code))
      .first();

    if (!item) {
      await trx('scan_events').insert({ order_id: orderId, user_id: userId, scanned_code: code, result: 'unexpected' });
      await trx('order_events').insert({ order_id: orderId, user_id: userId, type: 'ITEM_SCANNED', meta: JSON.stringify({ code, result: 'unexpected' }) });
      throw createError(422, `Code "${code}" not found in this order`);
    }

    if (item.scanned_qty >= item.qty) {
      await trx('scan_events').insert({ order_id: orderId, user_id: userId, scanned_code: code, result: 'duplicate', order_item_id: item.id });
      throw createError(409, `Item "${item.name}" already fully scanned (${item.qty}/${item.qty})`);
    }

    const newScanned = item.scanned_qty + 1;
    await trx('order_items').where({ id: item.id }).update({ scanned_qty: newScanned, updated_at: new Date() });
    await trx('scan_events').insert({ order_id: orderId, user_id: userId, scanned_code: code, result: 'ok', order_item_id: item.id });
    await trx('order_events').insert({ order_id: orderId, user_id: userId, type: 'ITEM_SCANNED', meta: JSON.stringify({ code, item_id: item.id, sku: item.sku, scanned: newScanned, required: item.qty }) });

    // Check if all items complete → auto-pack
    const pending = await trx('order_items').where({ order_id: orderId }).whereRaw('scanned_qty < qty');
    const allDone = pending.length === 0;

    if (allDone) {
      await trx('orders').where({ id: orderId }).update({ status: 'packed', packed_by: userId, packed_at: new Date(), updated_at: new Date() });
      await trx('order_events').insert({ order_id: orderId, user_id: userId, type: 'ORDER_PACKED', meta: JSON.stringify({ auto: true }) });
    }

    return {
      item: { ...item, scanned_qty: newScanned },
      allDone,
      order_status: allDone ? 'packed' : 'pending',
    };
  });
}

// ── Admin override pack ────────────────────────────────────────
async function packOrder(orderId, userId) {
  const order = await db('orders').where({ id: orderId }).first();
  if (!order) throw createError(404, 'Order not found');
  if (order.status === 'packed') throw createError(409, 'Already packed');
  await db('orders').where({ id: orderId }).update({ status: 'packed', packed_by: userId, packed_at: new Date(), updated_at: new Date() });
  await db('order_events').insert({ order_id: orderId, user_id: userId, type: 'ORDER_PACKED', meta: JSON.stringify({ auto: false, admin_override: true }) });
  return { ...order, status: 'packed' };
}

// ── Upsert from integration ────────────────────────────────────
async function upsertFromTN(tnOrder) {
  const existing = await db('orders').where({ tn_order_id: String(tnOrder.id) }).first();

  const orderData = {
    tn_order_id:         String(tnOrder.id),
    tn_order_number:     String(tnOrder.number),
    status:              tnOrder.payment_status === 'paid' && tnOrder.shipping_status !== 'delivered' ? 'pending' : existing?.status || 'pending',
    customer_name:       [tnOrder.customer?.name, tnOrder.customer?.lastname].filter(Boolean).join(' ') || 'Unknown',
    customer_email:      tnOrder.customer?.email || null,
    shipping_provider:   tnOrder.shipping?.provider?.name || null,
    shipping_label_code: tnOrder.shipping?.tracking_number || null,
    tn_created_at:       tnOrder.created_at ? new Date(tnOrder.created_at) : null,
    tn_updated_at:       tnOrder.updated_at ? new Date(tnOrder.updated_at) : null,
    updated_at:          new Date(),
  };

  let orderId;
  if (existing) {
    // Don't overwrite packed status
    if (existing.status !== 'packed') {
      await db('orders').where({ id: existing.id }).update(orderData);
    } else {
      await db('orders').where({ id: existing.id }).update({ tn_updated_at: orderData.tn_updated_at, updated_at: new Date() });
    }
    orderId = existing.id;
  } else {
    const [row] = await db('orders').insert({ ...orderData, created_at: new Date() }).returning('id');
    orderId = typeof row === 'object' ? row.id : row;
  }

  // Upsert items (only if not packed)
  const currentOrder = await db('orders').where({ id: orderId }).first();
  if (currentOrder.status !== 'packed' && tnOrder.products?.length > 0) {
    // Delete old items and re-insert (simpler than diff)
    const existingItems = await db('order_items').where({ order_id: orderId });
    if (!existingItems.length) {
      const items = tnOrder.products.map((p) => ({
        order_id: orderId,
        sku:     p.sku || String(p.product_id),
        barcode: p.barcode || null,
        name:    p.name,
        variant: p.variant?.values?.map((v) => v.es || v.en).join(' / ') || null,
        qty:     p.quantity,
        scanned_qty: 0,
      }));
      await db('order_items').insert(items);
    }
  }

  await db('order_events').insert({
    order_id: orderId,
    type: 'ORDER_SYNCED',
    meta: JSON.stringify({ tn_id: tnOrder.id, tn_number: tnOrder.number }),
  });

  return orderId;
}

module.exports = { list, getById, getByNumber, getByLabel, scanItem, packOrder, upsertFromTN };
