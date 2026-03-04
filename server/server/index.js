require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const { validateEnv } = require('./utils/startup');
const logger = require('./utils/logger');
const db = require('./db');
const app = require('./app');

const PORT = process.env.PORT || 4000;
const FRONTEND_BUILD = path.join(__dirname, '..', 'frontend-build');

// ── Validate env ───────────────────────────────────────────────
try {
  validateEnv();
} catch (err) {
  console.error(`[ZERO] Startup failed: ${err.message}`);
  process.exit(1);
}

// ── Serve Next.js standalone build ────────────────────────────
app.use('/_next/static', express.static(path.join(FRONTEND_BUILD, '.next', 'static'), {
  maxAge: '365d', immutable: true,
}));
app.use(express.static(path.join(FRONTEND_BUILD, 'public'), { maxAge: '1d' }));

let nextHandler = null;
try {
  const nextPath   = path.join(FRONTEND_BUILD, 'node_modules', 'next');
  const NextServer = require(path.join(nextPath, 'dist', 'server', 'next.js')).default;
  const nextServer = new NextServer({
    conf: require(path.join(FRONTEND_BUILD, '.next', 'required-server-files.json')).config,
    dir: FRONTEND_BUILD,
    dev: false,
    customServer: true,
  });
  nextHandler = nextServer.getRequestHandler();
  logger.info('Next.js standalone handler loaded');
} catch (err) {
  logger.warn({ msg: err.message }, 'No Next.js build found — run `npm run build`');
}

// Remove the 404 handler added by app.js before the catch-all
app._router.stack = app._router.stack.filter((l) => l.name !== 'notFoundHandler');

app.all('*', (req, res, next) => {
  if (nextHandler) return nextHandler(req, res).catch(next);
  res.status(503).send('<h2>Frontend not built. Run <code>npm run build</code> first.</h2>');
});

const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// ── Start ──────────────────────────────────────────────────────
async function start() {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connected');
  } catch (err) {
    logger.fatal({ err }, 'Database connection failed');
    process.exit(1);
  }

  http.createServer(app).listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'ZERO server started');
  });
}

start();
