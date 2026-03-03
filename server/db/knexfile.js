require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const migrationsDir = require('path').join(__dirname, 'migrations');
const seedsDir      = require('path').join(__dirname, 'seeds');

/**
 * Knex configuration — paths are absolute so knex CLI works
 * from any working directory (root or server/db/).
 */
module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST     || 'localhost',
      port:     Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME     || 'zero_db',
      user:     process.env.DB_USER     || 'zero_user',
      password: process.env.DB_PASSWORD || 'changeme',
      charset:  'utf8mb4',
    },
    pool: { min: 2, max: 10 },
    migrations: { directory: migrationsDir, tableName: 'knex_migrations' },
    seeds:      { directory: seedsDir },
  },

  test: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST         || 'localhost',
      port:     Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME_TEST    || 'zero_db_test',
      user:     process.env.DB_USER         || 'zero_user',
      password: process.env.DB_PASSWORD     || 'changeme',
      charset:  'utf8mb4',
    },
    pool: { min: 1, max: 5 },
    migrations: { directory: migrationsDir, tableName: 'knex_migrations' },
    seeds:      { directory: seedsDir },
  },

  production: {
    client: 'mysql2',
    connection: {
      host:     process.env.DB_HOST,
      port:     Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset:  'utf8mb4',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: { min: 2, max: 20 },
    migrations: { directory: migrationsDir, tableName: 'knex_migrations' },
    seeds:      { directory: seedsDir },
  },
};
