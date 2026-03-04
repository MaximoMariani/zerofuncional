const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  await knex('order_events').del();
  await knex('scan_events').del();
  await knex('order_items').del();
  await knex('orders').del();
  await knex('users').del();

  const hash = await bcrypt.hash('zero1234', 10);
  const [adminId] = await knex('users').insert({ email: 'admin@zero.local', password_hash: hash, role: 'admin' }).returning('id');
  const [opId]    = await knex('users').insert({ email: 'operator@zero.local', password_hash: hash, role: 'operator' }).returning('id');

  const admin = typeof adminId === 'object' ? adminId.id : adminId;

  const [o1] = await knex('orders').insert({
    tn_order_id: 'LOCAL-001', tn_order_number: '1001', status: 'pending',
    customer_name: 'Juan García', shipping_provider: 'andreani',
    shipping_label_code: 'AND000001234',
  }).returning('id');
  const [o2] = await knex('orders').insert({
    tn_order_id: 'LOCAL-002', tn_order_number: '1002', status: 'pending',
    customer_name: 'María López', shipping_provider: 'correo',
    shipping_label_code: 'CA123456789AR',
  }).returning('id');
  const [o3] = await knex('orders').insert({
    tn_order_id: 'LOCAL-003', tn_order_number: '1003', status: 'packed',
    customer_name: 'Carlos Ruiz', shipping_provider: 'andreani',
    shipping_label_code: 'AND000001235',
    packed_by: admin, packed_at: new Date(),
  }).returning('id');

  const id1 = typeof o1 === 'object' ? o1.id : o1;
  const id2 = typeof o2 === 'object' ? o2.id : o2;
  const id3 = typeof o3 === 'object' ? o3.id : o3;

  await knex('order_items').insert([
    { order_id: id1, sku: 'REMN-001', barcode: '7790001000011', name: 'Remera Negra', variant: 'Talle M', qty: 2 },
    { order_id: id1, sku: 'PANT-002', barcode: '7790001000022', name: 'Pantalón Azul', variant: 'Talle 32', qty: 1 },
    { order_id: id2, sku: 'BUZO-003', barcode: '7790001000033', name: 'Buzo Gris', variant: 'Talle XL', qty: 1 },
    { order_id: id2, sku: 'REMN-001', barcode: '7790001000011', name: 'Remera Negra', variant: 'Talle S', qty: 1 },
    { order_id: id3, sku: 'ZAPA-004', barcode: '7790001000044', name: 'Zapatillas', variant: 'Talle 42', qty: 1, scanned_qty: 1 },
  ]);

  console.log('\n✅ Seed complete');
  console.log('   admin@zero.local    / zero1234  (admin)');
  console.log('   operator@zero.local / zero1234  (operator)\n');
};
