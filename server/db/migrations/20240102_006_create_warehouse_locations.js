/**
 * Migration 006: warehouse_locations + product_locations
 *
 * warehouse_locations: physical positions in the warehouse (e.g. A1, B3, C2)
 * product_locations:   maps a SKU to a warehouse location
 *
 * During picking, the scan page reads product_locations to show
 * the operator where to find each item.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('warehouse_locations', (t) => {
    t.increments('id').primary();
    t.string('code', 20).notNullable().unique();   // e.g. "A1", "B3"
    t.string('zone', 50).nullable();               // e.g. "Zona A", "Depósito Sur"
    t.string('description', 255).nullable();
    t.boolean('active').notNullable().defaultTo(true);
    t.timestamps(true, true);

    t.index('code');
    t.index('zone');
  });

  await knex.schema.createTable('product_locations', (t) => {
    t.increments('id').primary();
    t.string('sku', 100).notNullable();
    t.integer('location_id').unsigned().notNullable()
      .references('id').inTable('warehouse_locations').onDelete('CASCADE');
    t.integer('stock').unsigned().nullable();      // optional stock hint
    t.timestamps(true, true);

    t.unique(['sku', 'location_id']);
    t.index('sku');
    t.index('location_id');
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('product_locations');
  await knex.schema.dropTableIfExists('warehouse_locations');
};
