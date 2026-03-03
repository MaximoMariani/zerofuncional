const pino = require('pino');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
  base: { service: 'zero-backend' },
  redact: ['req.headers.authorization', 'body.password', 'body.newPassword'],
});

module.exports = logger;
