/**
 * store_config — single-row table (id=1) holding Tiendanube OAuth tokens.
 * access_token is AES-256 encrypted at rest using TOKEN_ENCRYPTION_KEY.
 */
exports.up = async (knex) => {
  await knex.schema.createTable('store_config', (t) => {
    t.increments('id').primary();
    t.enu('provider', ['local', 'tiendanube']).notNullable().defaultTo('local');
    t.string('tn_store_id', 100).nullable();
    t.string('tn_store_name', 255).nullable();
    t.text('tn_access_token_enc').nullable();   // AES-256-GCM encrypted
    t.text('tn_refresh_token_enc').nullable();
    t.timestamp('last_sync_at').nullable();
    t.timestamps(true, true);
  });
  // Insert the single config row
  await knex('store_config').insert({ provider: 'local' });
};
exports.down = (knex) => knex.schema.dropTableIfExists('store_config');
