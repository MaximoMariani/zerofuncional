/**
 * Migration: Create audit_logs table
 * Immutable log of all significant user actions.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('audit_logs', (t) => {
    t.increments('id').primary();
    t.integer('user_id').unsigned().nullable().references('id').inTable('users').onDelete('SET NULL');
    t.string('action', 100).notNullable();       // e.g. "order.packed", "scan.ok"
    t.string('entity_type', 50).nullable();       // e.g. "order", "scan"
    t.integer('entity_id').unsigned().nullable();
    t.json('metadata').nullable();                // extra context as JSON
    t.string('ip_address', 45).nullable();
    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    t.index('user_id');
    t.index('action');
    t.index('entity_type');
    t.index('created_at');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('audit_logs');
};
