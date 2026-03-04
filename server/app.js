require('dotenv').config();
const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const compression = require('compression');
const pinoHttp   = require('pino-http');
const rateLimit  = require('express-rate-limit');
const logger     = require('./utils/logger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

const app = express();

app.set('trust proxy', 1);

// ── Security ──────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',').map(s => s.trim());
app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin requests (no origin) and listed origins
    if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes('*')) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(compression());
app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === '/health' } }));

// Global rate limiter
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}));

// ── Body parsing ───────────────────────────────────────────────
// NOTE: webhook route uses express.raw() — registered in integrations router BEFORE json()
app.use((req, res, next) => {
  // Skip JSON parsing for webhook (it needs raw body)
  if (req.path === '/api/integrations/tiendanube/webhook') return next();
  express.json({ limit: '2mb' })(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Routes ─────────────────────────────────────────────────────
app.use('/health',           require('./routes/health'));
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/orders',       require('./routes/orders'));
app.use('/api/integrations', require('./routes/integrations'));
app.use('/api/users',        require('./routes/users'));

// ── 404 + errors ───────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
