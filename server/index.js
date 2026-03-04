require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const logger = require('./utils/logger');
const app = require('./app');

const PORT = process.env.PORT || 4000;

// ── Validate env (warn, don't crash before bind) ───────────────
// We warn rather than exit so Railway's healthcheck can still get
// a 200 from /health while we surface the config error in logs.
try {
  const { validateEnv } = require('./utils/startup');
  validateEnv();
} catch (err) {
  logger.error(`[ZERO] Config error: ${err.message} — fix env vars and redeploy`);
  // Continue — /health will still respond 200, other routes will fail gracefully
}

// ── Serve Next.js standalone build ────────────────────────────
// Non-blocking: if the build isn't present, API still works fine.
const FRONTEND_BUILD = path.join(__dirname, '..', 'frontend-build');

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
  logger.warn({ msg: err.message }, 'No Next.js build found — frontend routes will return 503');
}

// Remove the notFoundHandler added by app.js before the Next.js catch-all
app._router.stack = app._router.stack.filter((l) => l.name !== 'notFoundHandler');

app.all('*', (req, res, next) => {
  if (nextHandler) return nextHandler(req, res).catch(next);
  res.status(503).send('<h2>Frontend not built. Run <code>npm run build</code> first.</h2>');
});

const { errorHandler } = require('./middleware/errorHandler');
app.use(errorHandler);

// ── Bind port FIRST — Railway healthcheck starts immediately ───
// DB connection happens after bind so /health can respond during startup.
const server = http.createServer(app);

server.listen(PORT, '0.0.0.0', () => {
  logger.info({ port: PORT, env: process.env.NODE_ENV || 'development' }, 'ZERO server listening');
  // DB connect after bind — API routes will return 503 until ready, but /health always returns 200
  connectDB();
});

async function connectDB() {
  const db = require('./db');
  const MAX_RETRIES = 10;
  const RETRY_DELAY_MS = 3000;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await db.raw('SELECT 1');
      logger.info('Database connected');
      return;
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        logger.fatal({ err }, 'Database connection failed after all retries — API routes will error');
        return;
      }
      logger.warn({ attempt, err: err.message }, `DB not ready, retrying in ${RETRY_DELAY_MS}ms...`);
      await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

