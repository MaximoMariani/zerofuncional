const db = require('../db');

/**
 * KPI Service
 *
 * All metrics are calculated from:
 *  - scans table (raw scan events)
 *  - order_events table (lifecycle events)
 *  - orders table (status + timestamps)
 *
 * All queries use a `date` parameter (YYYY-MM-DD, defaults to today).
 * "Today" is computed in DB timezone to avoid JS timezone shifts.
 */

function todayClause(col, knex = db) {
  return knex.raw(`DATE(${col}) = CURDATE()`);
}

function dateClause(col, date) {
  if (!date) return db.raw(`DATE(${col}) = CURDATE()`);
  return db.raw(`DATE(${col}) = ?`, [date]);
}

/**
 * GET /api/kpi/today
 * Summary dashboard numbers for today.
 */
async function getToday(date) {
  const [
    ordersPackedRow,
    ordersPendingRow,
    ordersInProgressRow,
    scansOkRow,
    scansErrorRow,
    avgPackTimeRow,
  ] = await Promise.all([
    // Orders packed today
    db('orders').count('id as cnt').where('status', 'packed').where(dateClause('updated_at', date)).first(),

    // Orders pending
    db('orders').count('id as cnt').where('status', 'pending').first(),

    // Orders in progress
    db('orders').count('id as cnt').where('status', 'in_progress').first(),

    // Successful scans today
    db('scans').count('id as cnt').where('result', 'ok').where(dateClause('scanned_at', date)).first(),

    // Error scans today (not_found + duplicate + error)
    db('scans').count('id as cnt').whereNot('result', 'ok').where(dateClause('scanned_at', date)).first(),

    // Avg minutes from ORDER_OPENED → ORDER_PACKED today
    db('order_events as open')
      .join('order_events as packed', 'open.order_id', 'packed.order_id')
      .where('open.event_type', 'ORDER_OPENED')
      .whereIn('packed.event_type', ['ORDER_PACKED', 'ORDER_PARTIAL'])
      .where(dateClause('packed.occurred_at', date))
      .avg(db.raw('TIMESTAMPDIFF(SECOND, open.occurred_at, packed.occurred_at) as avg_seconds'))
      .first(),
  ]);

  const scansOk = Number(scansOkRow?.cnt ?? 0);
  const scansErr = Number(scansErrorRow?.cnt ?? 0);
  const totalScans = scansOk + scansErr;
  const errorRate = totalScans > 0 ? ((scansErr / totalScans) * 100).toFixed(1) : '0.0';

  const avgSeconds = Number(avgPackTimeRow?.avg_seconds ?? 0);

  return {
    date: date || new Date().toISOString().slice(0, 10),
    orders_packed_today: Number(ordersPackedRow?.cnt ?? 0),
    orders_pending: Number(ordersPendingRow?.cnt ?? 0),
    orders_in_progress: Number(ordersInProgressRow?.cnt ?? 0),
    scans_ok_today: scansOk,
    scans_error_today: scansErr,
    scan_error_rate_pct: Number(errorRate),
    avg_pack_time_seconds: Math.round(avgSeconds),
    avg_pack_time_display: formatSeconds(Math.round(avgSeconds)),
  };
}

/**
 * GET /api/kpi/performance
 * Orders per hour + throughput for today (or given date).
 */
async function getPerformance(date) {
  // Orders packed per hour of day
  const byHour = await db('order_events')
    .select(db.raw('HOUR(occurred_at) as hour'))
    .count('id as orders_packed')
    .whereIn('event_type', ['ORDER_PACKED', 'ORDER_PARTIAL'])
    .where(dateClause('occurred_at', date))
    .groupByRaw('HOUR(occurred_at)')
    .orderBy('hour');

  // Fill missing hours with 0 (hours 0–23)
  const hourMap = Object.fromEntries(byHour.map((r) => [Number(r.hour), Number(r.orders_packed)]));
  const hourlyChart = Array.from({ length: 24 }, (_, h) => ({
    hour: `${String(h).padStart(2, '0')}:00`,
    orders_packed: hourMap[h] ?? 0,
  }));

  // Total packed this date and last 7 days for sparkline
  const last7 = await db('order_events')
    .select(db.raw('DATE(occurred_at) as day'))
    .count('id as orders_packed')
    .whereIn('event_type', ['ORDER_PACKED', 'ORDER_PARTIAL'])
    .where(db.raw('occurred_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)'))
    .groupByRaw('DATE(occurred_at)')
    .orderBy('day');

  return { hourly_chart: hourlyChart, last_7_days: last7 };
}

/**
 * GET /api/kpi/operators
 * Per-operator efficiency metrics for today (or given date).
 */
async function getOperators(date) {
  // Scans per operator
  const scanStats = await db('scans as s')
    .join('users as u', 's.user_id', 'u.id')
    .select('u.id as user_id', 'u.name as operator_name')
    .count(db.raw('CASE WHEN s.result = "ok" THEN 1 END as scans_ok'))
    .count(db.raw('CASE WHEN s.result != "ok" THEN 1 END as scans_error'))
    .count('s.id as total_scans')
    .where(dateClause('s.scanned_at', date))
    .groupBy('u.id', 'u.name');

  // Orders packed per operator (via events)
  const packedStats = await db('order_events as e')
    .join('users as u', 'e.user_id', 'u.id')
    .select('u.id as user_id')
    .count('e.id as orders_packed')
    .whereIn('e.event_type', ['ORDER_PACKED', 'ORDER_PARTIAL'])
    .where(dateClause('e.occurred_at', date))
    .groupBy('u.id');

  const packedMap = Object.fromEntries(packedStats.map((r) => [r.user_id, Number(r.orders_packed)]));

  const operators = scanStats.map((op) => {
    const ok = Number(op.scans_ok ?? 0);
    const err = Number(op.scans_error ?? 0);
    const total = ok + err;
    return {
      user_id: op.user_id,
      operator_name: op.operator_name,
      scans_ok: ok,
      scans_error: err,
      total_scans: total,
      error_rate_pct: total > 0 ? Number(((err / total) * 100).toFixed(1)) : 0,
      orders_packed: packedMap[op.user_id] ?? 0,
    };
  });

  // Sort by orders_packed desc (most efficient first)
  operators.sort((a, b) => b.orders_packed - a.orders_packed);

  return { date: date || new Date().toISOString().slice(0, 10), operators };
}

/**
 * GET /api/kpi/errors
 * Top products with scan errors + error type breakdown.
 */
async function getErrors(date) {
  // Top SKUs/barcodes with errors
  const topErrors = await db('scans')
    .select('barcode')
    .count('id as error_count')
    .whereNot('result', 'ok')
    .where(dateClause('scanned_at', date))
    .groupBy('barcode')
    .orderBy('error_count', 'desc')
    .limit(10);

  // Error type breakdown
  const breakdown = await db('scans')
    .select('result')
    .count('id as cnt')
    .whereNot('result', 'ok')
    .where(dateClause('scanned_at', date))
    .groupBy('result');

  // Missing items from exceptions
  const missingItems = await db('order_items')
    .join('orders', 'order_items.order_id', 'orders.id')
    .select('order_items.sku', 'order_items.name')
    .count('order_items.id as cnt')
    .where('order_items.exception_status', 'missing')
    .where(dateClause('order_items.updated_at', date))
    .groupBy('order_items.sku', 'order_items.name')
    .orderBy('cnt', 'desc')
    .limit(10);

  return {
    date: date || new Date().toISOString().slice(0, 10),
    top_error_barcodes: topErrors.map((r) => ({ barcode: r.barcode, count: Number(r.error_count) })),
    error_type_breakdown: breakdown.map((r) => ({ type: r.result, count: Number(r.cnt) })),
    top_missing_skus: missingItems.map((r) => ({ sku: r.sku, name: r.name, count: Number(r.cnt) })),
  };
}

// ── Helper ──────────────────────────────────────────────
function formatSeconds(secs) {
  if (!secs || secs <= 0) return '—';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

module.exports = { getToday, getPerformance, getOperators, getErrors };
