exports.up = async (knex) => {
  await knex.schema.createTable('users', (t) => {
    t.increments('id').primary();
    t.string('email', 255).notNullable().unique();
    t.string('password_hash', 255).notNullable();
    t.enu('role', ['admin', 'operator']).notNullable().defaultTo('operator');
    t.boolean('active').notNullable().defaultTo(true);
    t.string('refresh_token_hash', 255).nullable();
    t.timestamps(true, true);
    t.index('email');
  });
};
exports.down = (knex) => knex.schema.dropTableIfExists('users');
