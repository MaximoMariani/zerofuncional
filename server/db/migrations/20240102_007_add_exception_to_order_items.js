/**
 * Migration 007: add exception fields to order_items
 *
 * Tracks per-item exception state without changing the core scan flow.
 * exception_status: null (normal) | 'missing' | 'replaced'
 * replacement_sku:  only set when exception_status = 'replaced'
 * exception_note:   operator's note
 */
exports.up = async (knex) => {
  await knex.schema.alterTable('order_items', (t) => {
    t.enu('exception_status', ['missing', 'replaced']).nullable().after('status');
    t.string('replacement_sku', 100).nullable().after('exception_status');
    t.string('exception_note', 500).nullable().after('replacement_sku');
  });
};

exports.down = async (knex) => {
  await knex.schema.alterTable('order_items', (t) => {
    t.dropColumn('exception_note');
    t.dropColumn('replacement_sku');
    t.dropColumn('exception_status');
  });
};
