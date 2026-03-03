/**
 * Migration 005: order_events
 *
 * Event log for every significant action on an order.
 * Drives KPI calculation (Feature 1) and exception tracking (Feature 3).
 *
 * Events:
 *   ORDER_OPENED       - order moved to in_progress
 *   ITEM_SCANNED       - successful scan
 *   ITEM_MISSING       - operator marked item as missing
 *   ITEM_REPLACED      - operator authorized a replacement
 *   SUPERVISOR_OVERRIDE - supervisor approved a partial/exception
 *   ORDER_PACKED       - order fully packed
 *   ORDER_PARTIAL      - order packed with missing items (exception)
 */
exports.up = async (knex) => {
  await knex.schema.createTable('order_events', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable()
      .references('id').inTable('orders').onDelete('CASCADE');
    t.integer('order_item_id').unsigned().nullable()
      .references('id').inTable('order_items').onDelete('SET NULL');
    t.integer('user_id').unsigned().nullable()
      .references('id').inTable('users').onDelete('SET NULL');

    t.enu('event_type', [
      'ORDER_OPENED',
      'ITEM_SCANNED',
      'ITEM_MISSING',
      'ITEM_REPLACED',
      'SUPERVISOR_OVERRIDE',
      'ORDER_PACKED',
      'ORDER_PARTIAL',
    ]).notNullable();

    t.json('payload').nullable();     // flexible extra data per event
    t.string('notes', 500).nullable(); // operator note or reason
    t.timestamp('occurred_at').notNullable().defaultTo(knex.fn.now());

    t.index('order_id');
    t.index('user_id');
    t.index('event_type');
    t.index('occurred_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('order_events');
};
