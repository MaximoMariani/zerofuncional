const bcrypt = require('bcryptjs');

/**
 * Seed: Development data
 * Covers all tables including new features: locations, order_events, exceptions.
 * DO NOT run in production.
 */
exports.seed = async (knex) => {
  // Clean in FK dependency order
  await knex('order_events').del();
  await knex('audit_logs').del();
  await knex('scans').del();
  await knex('order_items').del();
  await knex('orders').del();
  await knex('product_locations').del();
  await knex('warehouse_locations').del();
  await knex('users').del();

  // ── Users ────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('zero1234', 10);

  const [adminId] = await knex('users').insert({ name: 'Admin ZERO', email: 'admin@zero.local', password_hash: passwordHash, role: 'admin', active: true });
  const [op1Id]   = await knex('users').insert({ name: 'Operador 1', email: 'operator@zero.local', password_hash: passwordHash, role: 'operator', active: true });
  const [op2Id]   = await knex('users').insert({ name: 'Operador 2', email: 'operator2@zero.local', password_hash: passwordHash, role: 'operator', active: true });
  await knex('users').insert({ name: 'Supervisor', email: 'viewer@zero.local', password_hash: passwordHash, role: 'viewer', active: true });

  // ── Warehouse Locations ───────────────────────────────
  const [locA1] = await knex('warehouse_locations').insert({ code: 'A1', zone: 'Zona A', description: 'Estante A fila 1' });
  const [locA2] = await knex('warehouse_locations').insert({ code: 'A2', zone: 'Zona A', description: 'Estante A fila 2' });
  const [locB1] = await knex('warehouse_locations').insert({ code: 'B1', zone: 'Zona B', description: 'Estante B fila 1' });
  const [locB2] = await knex('warehouse_locations').insert({ code: 'B2', zone: 'Zona B', description: 'Estante B fila 2' });
  const [locC1] = await knex('warehouse_locations').insert({ code: 'C1', zone: 'Zona C', description: 'Depósito sur' });

  // ── Product Locations ─────────────────────────────────
  await knex('product_locations').insert([
    { sku: 'PROD-001', location_id: locA1, stock: 50 },
    { sku: 'PROD-002', location_id: locA2, stock: 30 },
    { sku: 'PROD-003', location_id: locB1, stock: 20 },
    { sku: 'PROD-004', location_id: locB2, stock: 15 },
    { sku: 'PROD-005', location_id: locC1, stock: 5  },
  ]);

  // ── Orders ───────────────────────────────────────────
  const now = new Date();
  const todayMinus1h = new Date(now - 60 * 60 * 1000);
  const todayMinus2h = new Date(now - 2 * 60 * 60 * 1000);

  const [order1Id] = await knex('orders').insert({ customer_name: 'Juan García',   customer_email: 'juan@example.com',   status: 'pending',     assigned_to: op1Id,   created_at: todayMinus2h, updated_at: todayMinus2h });
  const [order2Id] = await knex('orders').insert({ customer_name: 'María López',   customer_email: 'maria@example.com',  status: 'in_progress', assigned_to: op1Id,   created_at: todayMinus1h, updated_at: todayMinus1h });
  const [order3Id] = await knex('orders').insert({ customer_name: 'Carlos Ruiz',   customer_email: 'carlos@example.com', status: 'packed',      assigned_to: adminId, created_at: todayMinus2h, updated_at: todayMinus1h });
  const [order4Id] = await knex('orders').insert({ customer_name: 'Laura Martínez',customer_email: 'laura@example.com',  status: 'packed',      assigned_to: op2Id,   created_at: todayMinus2h, updated_at: now });

  // ── Order Items ──────────────────────────────────────
  const [item1a] = await knex('order_items').insert({ order_id: order1Id, sku: 'PROD-001', barcode: '7790001000011', name: 'Remera Negra M',   quantity: 2, scanned_qty: 0, status: 'pending' });
  const [item1b] = await knex('order_items').insert({ order_id: order1Id, sku: 'PROD-002', barcode: '7790001000022', name: 'Pantalón Azul 32', quantity: 1, scanned_qty: 0, status: 'pending' });

  const [item2a] = await knex('order_items').insert({ order_id: order2Id, sku: 'PROD-003', barcode: '7790001000033', name: 'Buzo Gris XL',     quantity: 3, scanned_qty: 1, status: 'partial' });
  const [item2b] = await knex('order_items').insert({ order_id: order2Id, sku: 'PROD-001', barcode: '7790001000011', name: 'Remera Negra M',   quantity: 1, scanned_qty: 1, status: 'complete' });

  const [item3a] = await knex('order_items').insert({ order_id: order3Id, sku: 'PROD-004', barcode: '7790001000044', name: 'Zapatillas 42',    quantity: 2, scanned_qty: 2, status: 'complete' });
  const [item3b] = await knex('order_items').insert({ order_id: order3Id, sku: 'PROD-005', barcode: '7790001000055', name: 'Medias Pack x3',   quantity: 1, scanned_qty: 0, status: 'pending',  exception_status: 'missing', exception_note: 'Sin stock en depósito' });

  const [item4a] = await knex('order_items').insert({ order_id: order4Id, sku: 'PROD-001', barcode: '7790001000011', name: 'Remera Negra M',   quantity: 1, scanned_qty: 1, status: 'complete' });
  const [item4b] = await knex('order_items').insert({ order_id: order4Id, sku: 'PROD-002', barcode: '7790001000022', name: 'Pantalón Azul 32', quantity: 1, scanned_qty: 0, status: 'pending',  exception_status: 'replaced', replacement_sku: 'PROD-003', exception_note: 'Reemplazo autorizado por supervisor' });

  // ── Scans (histórico de hoy) ──────────────────────────
  const scanRows = [
    { order_id: order2Id, order_item_id: item2a, user_id: op1Id, barcode: '7790001000033', result: 'ok', scanned_at: todayMinus1h },
    { order_id: order2Id, order_item_id: item2b, user_id: op1Id, barcode: '7790001000011', result: 'ok', scanned_at: todayMinus1h },
    { order_id: order2Id, order_item_id: null,   user_id: op1Id, barcode: '9999999999999', result: 'not_found', error_message: 'Barcode no encontrado', scanned_at: todayMinus1h },
    { order_id: order3Id, order_item_id: item3a, user_id: adminId, barcode: '7790001000044', result: 'ok', scanned_at: todayMinus2h },
    { order_id: order3Id, order_item_id: item3a, user_id: adminId, barcode: '7790001000044', result: 'ok', scanned_at: todayMinus2h },
    { order_id: order4Id, order_item_id: item4a, user_id: op2Id, barcode: '7790001000011', result: 'ok', scanned_at: now },
  ];
  await knex('scans').insert(scanRows);

  // ── Order Events ──────────────────────────────────────
  await knex('order_events').insert([
    // Order 2: in_progress
    { order_id: order2Id, user_id: op1Id,   event_type: 'ORDER_OPENED',  payload: JSON.stringify({ triggered_by: 'first_scan' }), occurred_at: todayMinus1h },
    { order_id: order2Id, order_item_id: item2b, user_id: op1Id, event_type: 'ITEM_SCANNED', payload: JSON.stringify({ sku: 'PROD-001', scanned: 1, total: 1 }), occurred_at: todayMinus1h },
    { order_id: order2Id, order_item_id: item2a, user_id: op1Id, event_type: 'ITEM_SCANNED', payload: JSON.stringify({ sku: 'PROD-003', scanned: 1, total: 3 }), occurred_at: todayMinus1h },
    // Order 3: packed with missing item
    { order_id: order3Id, user_id: adminId, event_type: 'ORDER_OPENED',  payload: JSON.stringify({ triggered_by: 'first_scan' }), occurred_at: todayMinus2h },
    { order_id: order3Id, order_item_id: item3a, user_id: adminId, event_type: 'ITEM_SCANNED', payload: JSON.stringify({ sku: 'PROD-004', scanned: 2, total: 2 }), occurred_at: todayMinus2h },
    { order_id: order3Id, order_item_id: item3b, user_id: adminId, event_type: 'ITEM_MISSING', notes: 'Sin stock en depósito', payload: JSON.stringify({ sku: 'PROD-005' }), occurred_at: todayMinus1h },
    { order_id: order3Id, user_id: adminId, event_type: 'ORDER_PARTIAL', payload: JSON.stringify({ exceptions: 1 }), occurred_at: todayMinus1h },
    // Order 4: packed with replacement
    { order_id: order4Id, user_id: op2Id, event_type: 'ORDER_OPENED', payload: JSON.stringify({ triggered_by: 'first_scan' }), occurred_at: todayMinus2h },
    { order_id: order4Id, order_item_id: item4a, user_id: op2Id, event_type: 'ITEM_SCANNED', payload: JSON.stringify({ sku: 'PROD-001', scanned: 1, total: 1 }), occurred_at: todayMinus2h },
    { order_id: order4Id, order_item_id: item4b, user_id: op2Id, event_type: 'ITEM_REPLACED', payload: JSON.stringify({ original_sku: 'PROD-002', replacement_sku: 'PROD-003' }), notes: 'Reemplazo autorizado por supervisor', occurred_at: now },
    { order_id: order4Id, user_id: adminId, event_type: 'SUPERVISOR_OVERRIDE', notes: 'Aprobado', occurred_at: now },
    { order_id: order4Id, user_id: op2Id, event_type: 'ORDER_PARTIAL', payload: JSON.stringify({ exceptions: 1 }), occurred_at: now },
  ]);

  console.log('✅ Seed completo');
  console.log('   admin@zero.local     / zero1234  (admin)');
  console.log('   operator@zero.local  / zero1234  (operator)');
  console.log('   operator2@zero.local / zero1234  (operator)');
  console.log('   viewer@zero.local    / zero1234  (viewer/supervisor)');
};
