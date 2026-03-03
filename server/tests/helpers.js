/**
 * Test helpers: DB setup, JWT signing, request builder.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env.example') });

// Ensure test env
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-chars-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-chars-long';
process.env.JWT_ACCESS_EXPIRES = '15m';
process.env.JWT_REFRESH_EXPIRES = '7d';

const jwt = require('jsonwebtoken');

function makeToken(user = {}) {
  return jwt.sign(
    { sub: user.id || 1, email: user.email || 'test@test.com', role: user.role || 'admin' },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: '1h' }
  );
}

module.exports = { makeToken };
