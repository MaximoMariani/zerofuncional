require('dotenv').config();
const app = require('./app');
const logger = require('./utils/logger');
const db = require('./db');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection established');

    app.listen(PORT, '0.0.0.0', () => {
      logger.info({ port: PORT, env: process.env.NODE_ENV }, 'ZERO backend started');
    });
  } catch (err) {
    logger.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }
}

start();
