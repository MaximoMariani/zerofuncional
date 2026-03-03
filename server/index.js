require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');

const logger = require('./utils/logger');
const db     = require('./db');

// The Express app (all API routes, middleware, error handlers)
const app = require('./app');

// ─────────────────────────────────────────────────────────
//  Serve Next.js standalone build
//
//  `npm run build` (root) runs `cd frontend && next build` which, with
//  `output: 'standalone'` in next.config.js, produces:
//
//    frontend/.next/standalone/        ← self-contained Next server
//    frontend/.next/static/            ← hashed JS/CSS bundles
//    frontend/public/                  ← public assets
//
//  The build script (package.json) then copies those into:
//    frontend-build/                   ← standalone server.js + node_modules
//    frontend-build/.next/static/      ← static assets
//    frontend-build/public/            ← public assets
// ─────────────────────────────────────────────────────────
const FRONTEND_BUILD = path.join(__dirname, '..', 'frontend-build');

// Long-cache for hashed Next.js bundles (filename = content hash)
app.use(
  '/_next/static',
  express.static(path.join(FRONTEND_BUILD, '.next', 'static'), {
    maxAge: '365d',
    immutable: true,
  })
);

// Short-cache for public assets
app.use(express.static(path.join(FRONTEND_BUILD, 'public'), { maxAge: '1d' }));

// Load the Next.js standalone request handler
let nextHandler = null;
try {
  // next/dist/server/next is bundled inside the standalone output
  const nextPath    = path.join(FRONTEND_BUILD, 'node_modules', 'next');
  const NextServer  = require(path.join(nextPath, 'dist', 'server', 'next.js')).default;
  const nextServer  = new NextServer({
    conf:         require(path.join(FRONTEND_BUILD, '.next', 'required-server-files.json')).config,
    dir:          FRONTEND_BUILD,
    dev:          false,
    customServer: true,
  });
  nextHandler = nextServer.getRequestHandler();
  logger.info('Next.js standalone handler loaded');
} catch (err) {
  logger.warn({ msg: err.message }, 'No Next.js build found at frontend-build/ — run `npm run build`');
}

// Catch-all: all non-API, non-static routes → Next.js
// (registered AFTER API routes inside app.js, overrides the notFoundHandler for frontend routes)
app._router.stack = app._router.stack.filter(
  (layer) => !(layer.name === 'notFoundHandler')
);

app.all('*', (req, res, next) => {
  if (nextHandler) {
    return nextHandler(req, res).catch(next);
  }
  res.status(503).send(
    '<!DOCTYPE html><html><body>' +
    '<h2>Frontend not built yet.</h2>' +
    '<p>Run <code>npm run build</code> and restart.</p>' +
    '</body></html>'
  );
});

// ─────────────────────────────────────────────────────────
//  Start server
// ─────────────────────────────────────────────────────────
const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await db.raw('SELECT 1');
    logger.info('Database connection OK');
  } catch (err) {
    logger.fatal({ err }, 'Database unreachable — check DB_* env vars');
    process.exit(1);
  }

  const server = http.createServer(app);
  server.listen(PORT, '0.0.0.0', () => {
    logger.info({ port: PORT, env: process.env.NODE_ENV || 'production' },
      'ZERO server started — API + Frontend on same port');
  });
}

start();
