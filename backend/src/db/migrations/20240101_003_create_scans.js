/**
 * Migration: Create scans table
 * Records every barcode scan event with result and context.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('scans', (t) => {
    t.increments('id').primary();
    t.integer('order_id').unsigned().notNullable().references('id').inTable('orders').onDelete('CASCADE');
    t.integer('order_item_id').unsigned().nullable().references('id').inTable('order_items').onDelete('SET NULL');
    t.integer('user_id').unsigned().notNullable().references('id').inTable('users').onDelete('CASCADE');
    t.string('barcode', 100).notNullable();
    t.enu('result', ['ok', 'error', 'duplicate', 'not_found']).notNullable();
    t.string('error_message', 255).nullable();
    t.timestamp('scanned_at').notNullable().defaultTo(knex.fn.now());

    t.index('order_id');
    t.index('user_id');
    t.index('barcode');
    t.index('scanned_at');
    t.index('result');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('scans');
};
