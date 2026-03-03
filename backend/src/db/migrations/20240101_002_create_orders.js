/**
 * Migration: Create orders and order_items tables
 */
exports.up = async (knex) => {
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    // External ID from integration provider (e.g. Tiendanube order id)
    // NULL when INTEGRATION_PROVIDER=local
    t.string('external_id', 100).nullable().unique();
    t.string('customer_name', 255).notNullable();
    t.string('customer_email', 255).nullable();
    t.enu('status', ['pending', 'in_progress', 'packed', 'cancelled'])
      .notNullable()
      .defaultTo('pending');
    t.integer('assigned_to').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.text('notes').nullable();
    t.timestamps(true, true);

    t.index('status');
    t.index('external_id');
    t.index('assigned_to');
    t.index('created_at');
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.string('sku', 100).notNullable();
    t.string('barcode', 100).nullable();
    t.string('name', 255).notNullable();
    t.integer('quantity').unsigned().notNullable().defaultTo(1);
    t.integer('scanned_qty').unsigned().notNullable().defaultTo(0);
    t.enu('status', ['pending', 'partial', 'complete']).notNullable().defaultTo('pending');
    t.timestamps(true, true);

    t.index('order_id');
    t.index('sku');
    t.index('barcode');
    t.index('status');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
};
