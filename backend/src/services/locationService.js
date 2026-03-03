const db = require('../db');
const { createError } = require('../middleware/errorHandler');

/**
 * List all warehouse locations.
 */
async function listLocations({ activeOnly = false } = {}) {
  let q = db('warehouse_locations').orderBy('code');
  if (activeOnly) q = q.where('active', true);
  return q;
}

/**
 * Create a warehouse location.
 */
async function createLocation({ code, zone, description }) {
  const exists = await db('warehouse_locations').where({ code: code.toUpperCase() }).first();
  if (exists) throw createError(409, `Location ${code} already exists`);

  const [id] = await db('warehouse_locations').insert({
    code: code.toUpperCase(),
    zone: zone || null,
    description: description || null,
  });
  return db('warehouse_locations').where({ id }).first();
}

/**
 * Assign (or update) a product SKU to a location.
 */
async function setProductLocation({ sku, locationId, stock }) {
  const loc = await db('warehouse_locations').where({ id: locationId, active: true }).first();
  if (!loc) throw createError(404, 'Location not found or inactive');

  const existing = await db('product_locations').where({ sku }).first();

  if (existing) {
    await db('product_locations').where({ sku }).update({
      location_id: locationId,
      stock: stock ?? null,
      updated_at: db.fn.now(),
    });
  } else {
    await db('product_locations').insert({
      sku,
      location_id: locationId,
      stock: stock ?? null,
    });
  }

  return getLocationBySku(sku);
}

/**
 * Get location for a SKU.
 */
async function getLocationBySku(sku) {
  return db('product_locations as pl')
    .join('warehouse_locations as wl', 'pl.location_id', 'wl.id')
    .select('pl.sku', 'pl.stock', 'wl.id as location_id', 'wl.code', 'wl.zone', 'wl.description')
    .where('pl.sku', sku)
    .first();
}

/**
 * Bulk-fetch locations for a list of SKUs (used by order detail page, avoids N+1).
 */
async function getLocationsBySkus(skus) {
  if (!skus.length) return {};
  const rows = await db('product_locations as pl')
    .join('warehouse_locations as wl', 'pl.location_id', 'wl.id')
    .select('pl.sku', 'wl.code', 'wl.zone')
    .whereIn('pl.sku', skus);
  return Object.fromEntries(rows.map((r) => [r.sku, { code: r.code, zone: r.zone }]));
}

module.exports = { listLocations, createLocation, setProductLocation, getLocationBySku, getLocationsBySkus };
