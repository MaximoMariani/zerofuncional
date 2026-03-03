const db = require('../db');
const { createError } = require('../middleware/errorHandler');
const { audit } = require('./auditService');
const { emit } = require('./eventService');
const { getLocationBySku } = require('./locationService');

/**
 * Process a barcode scan for a given order.
 *
 * Flow:
 * 1. Validate order exists and is in_progress or pending
 * 2. Find matching order item by barcode
 * 3. Increment scanned_qty; update item status
 * 4. Emit ITEM_SCANNED event (+ ORDER_OPENED if first scan)
 * 5. Record scan row + audit log
 * 6. Attach warehouse location to response
 *
 * DO NOT modify this core logic when integrating Tiendanube.
 */
async function processScan({ orderId, barcode, userId, ipAddress }) {
  return db.transaction(async (trx) => {
    // 1. Load order
    const order = await trx('orders').where({ id: orderId }).first();
    if (!order) throw createError(404, 'Order not found');

    if (!['pending', 'in_progress'].includes(order.status)) {
      const errMsg = `Order is ${order.status}, cannot scan`;
      await _recordScan(trx, { orderId, itemId: null, userId, barcode, result: 'error', errorMessage: errMsg });
      throw createError(409, errMsg);
    }

    // 2. Find item by barcode
    const item = await trx('order_items').where({ order_id: orderId, barcode }).first();

    if (!item) {
      const errMsg = `Barcode ${barcode} not found in this order`;
      await _recordScan(trx, { orderId, itemId: null, userId, barcode, result: 'not_found', errorMessage: errMsg });
      await audit({ userId, action: 'scan.not_found', entityType: 'order', entityId: orderId, metadata: { barcode }, ipAddress, trx });
      throw createError(404, errMsg);
    }

    if (item.status === 'complete') {
      const errMsg = `Item ${item.sku} already fully scanned`;
      await _recordScan(trx, { orderId, itemId: item.id, userId, barcode, result: 'duplicate', errorMessage: errMsg });
      await audit({ userId, action: 'scan.duplicate', entityType: 'order', entityId: orderId, metadata: { barcode, sku: item.sku }, ipAddress, trx });
      throw createError(409, errMsg);
    }

    // 3. Increment scanned_qty
    const newScanned = item.scanned_qty + 1;
    const newItemStatus = newScanned >= item.quantity ? 'complete' : 'partial';

    await trx('order_items').where({ id: item.id }).update({
      scanned_qty: newScanned,
      status: newItemStatus,
      updated_at: db.fn.now(),
    });

    // 4. Emit ORDER_OPENED on first scan of a pending order
    if (order.status === 'pending') {
      await trx('orders').where({ id: orderId }).update({ status: 'in_progress', updated_at: db.fn.now() });
      await emit({ orderId, userId, eventType: 'ORDER_OPENED', payload: { triggered_by: 'first_scan' }, trx });
    }

    // Check if all items complete now
    const remaining = await trx('order_items')
      .where({ order_id: orderId })
      .whereNot('status', 'complete')
      .whereNull('exception_status')  // items with exception don't block
      .count('id as cnt');
    const allDone = Number(remaining[0].cnt) === 0;

    // Emit ITEM_SCANNED
    await emit({
      orderId,
      itemId: item.id,
      userId,
      eventType: 'ITEM_SCANNED',
      payload: { barcode, sku: item.sku, scanned: newScanned, total: item.quantity },
      trx,
    });

    // 5. Record scan row + audit
    await _recordScan(trx, { orderId, itemId: item.id, userId, barcode, result: 'ok', errorMessage: null });
    await audit({
      userId,
      action: 'scan.ok',
      entityType: 'order',
      entityId: orderId,
      metadata: { barcode, sku: item.sku, scanned: newScanned, total: item.quantity },
      ipAddress,
      trx,
    });

    // 6. Fetch location (outside trx — read-only)
    const location = await getLocationBySku(item.sku).catch(() => null);

    return {
      item: { ...item, scanned_qty: newScanned, status: newItemStatus, location: location || null },
      allItemsComplete: allDone,
      orderStatus: 'in_progress',
    };
  });
}

async function _recordScan(trx, { orderId, itemId, userId, barcode, result, errorMessage }) {
  await trx('scans').insert({
    order_id: orderId,
    order_item_id: itemId,
    user_id: userId,
    barcode,
    result,
    error_message: errorMessage,
    scanned_at: db.fn.now(),
  });
}

module.exports = { processScan };
