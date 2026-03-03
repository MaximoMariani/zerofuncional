require('dotenv').config();

/**
 * Knex configuration for development, test, and production.
 * Migrations live in src/db/migrations, seeds in src/db/seeds.
 */
module.exports = {
  development: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME || 'zero_db',
      user: process.env.DB_USER || 'zero_user',
      password: process.env.DB_PASSWORD || 'changeme',
      charset: 'utf8mb4',
    },
    pool: { min: 2, max: 10 },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  test: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME_TEST || 'zero_db_test',
      user: process.env.DB_USER || 'zero_user',
      password: process.env.DB_PASSWORD || 'changeme',
      charset: 'utf8mb4',
    },
    pool: { min: 1, max: 5 },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  production: {
    client: 'mysql2',
    connection: {
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      charset: 'utf8mb4',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    },
    pool: { min: 2, max: 20 },
    migrations: {
      directory: './migrations',
      tableName: 'knex_migrations',
    },
  },
};
