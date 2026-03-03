const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { createError } = require('../middleware/errorHandler');

const ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES }
  );
}

function signRefresh(userId) {
  return jwt.sign(
    { sub: userId, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES }
  );
}

async function login(email, password) {
  const user = await db('users').where({ email: email.toLowerCase(), active: true }).first();
  if (!user) throw createError(401, 'Invalid credentials');

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw createError(401, 'Invalid credentials');

  const accessToken = signAccess(user);
  const refreshToken = signRefresh(user.id);

  // Store hashed refresh token so we can revoke it
  const tokenHash = await bcrypt.hash(refreshToken, 8);
  await db('users').where({ id: user.id }).update({ refresh_token_hash: tokenHash });

  return {
    accessToken,
    refreshToken,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  };
}

async function refresh(refreshToken) {
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
  } catch {
    throw createError(401, 'Invalid or expired refresh token');
  }

  const user = await db('users').where({ id: payload.sub, active: true }).first();
  if (!user || !user.refresh_token_hash) throw createError(401, 'Session revoked');

  const valid = await bcrypt.compare(refreshToken, user.refresh_token_hash);
  if (!valid) throw createError(401, 'Invalid refresh token');

  const newAccessToken = signAccess(user);
  const newRefreshToken = signRefresh(user.id);
  const newHash = await bcrypt.hash(newRefreshToken, 8);
  await db('users').where({ id: user.id }).update({ refresh_token_hash: newHash });

  return { accessToken: newAccessToken, refreshToken: newRefreshToken };
}

async function logout(userId) {
  await db('users').where({ id: userId }).update({ refresh_token_hash: null });
}

module.exports = { login, refresh, logout };
