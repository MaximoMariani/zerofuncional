require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const migrationsDir = require('path').join(__dirname, 'migrations');
const seedsDir      = require('path').join(__dirname, 'seeds');

function connection() {
  if (process.env.DATABASE_URL) {
    return {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    };
  }
  return {
    host:     process.env.DB_HOST     || 'localhost',
    port:     Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME     || 'zero_db',
    user:     process.env.DB_USER     || 'zero_user',
    password: process.env.DB_PASSWORD || 'changeme',
  };
}

module.exports = {
  development: {
    client: 'pg',
    connection: connection(),
    pool: { min: 1, max: 5 },
    migrations: { directory: migrationsDir, tableName: 'knex_migrations' },
    seeds:      { directory: seedsDir },
  },
  test: {
    client: 'pg',
    connection: connection(),
    pool: { min: 1, max: 3 },
    migrations: { directory: migrationsDir, tableName: 'knex_migrations' },
    seeds:      { directory: seedsDir },
  },
  production: {
    client: 'pg',
    connection: connection(),
    pool: { min: 2, max: 20 },
    migrations: { directory: migrationsDir, tableName: 'knex_migrations' },
  },
};
