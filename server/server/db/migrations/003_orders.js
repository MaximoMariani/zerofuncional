exports.up = async (knex) => {
  await knex.schema.createTable('orders', (t) => {
    t.increments('id').primary();
    t.string('tn_order_id', 100).nullable().unique();   // Tiendanube order id
    t.string('tn_order_number', 50).nullable();         // human-readable "#1234"
    t.enu('status', ['pending', 'packed', 'cancelled']).notNullable().defaultTo('pending');
    t.string('customer_name', 255).notNullable().defaultTo('');
    t.string('customer_email', 255).nullable();
    t.string('shipping_provider', 100).nullable();      // "andreani", "correo", etc
    t.string('shipping_label_code', 255).nullable();    // Andreani tracking / label code
    t.integer('packed_by').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.timestamp('packed_at').nullable();
    t.timestamp('tn_created_at').nullable();
    t.timestamp('tn_updated_at').nullable();
    t.timestamps(true, true);

    t.index('status');
    t.index('tn_order_number');
    t.index('shipping_label_code');
    t.index('tn_order_id');
  });

  await knex.schema.createTable('order_items', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.string('sku', 100).notNullable();
    t.string('barcode', 100).nullable();
    t.string('name', 255).notNullable();
    t.string('variant', 255).nullable();       // "Color: Rojo / Talle: M"
    t.integer('qty').unsigned().notNullable().defaultTo(1);
    t.integer('scanned_qty').unsigned().notNullable().defaultTo(0);
    t.timestamps(true, true);

    t.index('order_id');
    t.index('sku');
    t.index('barcode');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('order_items');
  await knex.schema.dropTableIfExists('orders');
};
