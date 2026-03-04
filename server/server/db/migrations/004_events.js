exports.up = async (knex) => {
  await knex.schema.createTable('scan_events', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.integer('user_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.string('scanned_code', 255).notNullable();
    t.enu('result', ['ok', 'unexpected', 'duplicate']).notNullable();
    t.integer('order_item_id').unsigned().nullable()
      .references('id').inTable('order_items').onDelete('SET NULL');
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('order_id');
    t.index('user_id');
    t.index('result');
  });

  await knex.schema.createTable('order_events', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.integer('user_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    t.enu('type', ['LABEL_SCANNED', 'ITEM_SCANNED', 'ORDER_PACKED', 'ORDER_SYNCED', 'WEBHOOK_UPDATE']).notNullable();
    t.jsonb('meta').nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('order_id');
    t.index('type');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('order_events');
  await knex.schema.dropTableIfExists('scan_events');
};
