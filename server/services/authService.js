const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const db = require('../db');
const { createError } = require('../middleware/errorHandler');

const ACCESS_EXPIRES  = () => process.env.JWT_ACCESS_EXPIRES  || '15m';
const REFRESH_EXPIRES = () => process.env.JWT_REFRESH_EXPIRES || '7d';

function signAccess(user) {
  return jwt.sign({ sub: user.id, email: user.email, role: user.role }, process.env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES() });
}
function signRefresh(userId) {
  return jwt.sign({ sub: userId, jti: uuid() }, process.env.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES() });
}

async function login(email, password) {
  const user = await db('users').where({ email: email.toLowerCase(), active: true }).first();
  if (!user) throw createError(401, 'Invalid credentials');
  if (!await bcrypt.compare(password, user.password_hash)) throw createError(401, 'Invalid credentials');

  const accessToken  = signAccess(user);
  const refreshToken = signRefresh(user.id);
  await db('users').where({ id: user.id }).update({ refresh_token_hash: await bcrypt.hash(refreshToken, 8) });
  return { accessToken, refreshToken, user: { id: user.id, email: user.email, role: user.role } };
}

async function refresh(token) {
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET); }
  catch { throw createError(401, 'Invalid or expired refresh token'); }

  const user = await db('users').where({ id: payload.sub, active: true }).first();
  if (!user?.refresh_token_hash) throw createError(401, 'Session revoked');
  if (!await bcrypt.compare(token, user.refresh_token_hash)) throw createError(401, 'Invalid refresh token');

  const newAccess  = signAccess(user);
  const newRefresh = signRefresh(user.id);
  await db('users').where({ id: user.id }).update({ refresh_token_hash: await bcrypt.hash(newRefresh, 8) });
  return { accessToken: newAccess, refreshToken: newRefresh };
}

async function logout(userId) {
  await db('users').where({ id: userId }).update({ refresh_token_hash: null });
}

async function register(email, password, role = 'operator') {
  const exists = await db('users').where({ email: email.toLowerCase() }).first();
  if (exists) throw createError(409, 'Email already registered');
  const hash = await bcrypt.hash(password, 10);
  const [row] = await db('users').insert({ email: email.toLowerCase(), password_hash: hash, role }).returning(['id', 'email', 'role']);
  return row;
}

async function isFirstRun() {
  const [{ count }] = await db('users').count('id as count');
  return Number(count) === 0;
}

module.exports = { login, refresh, logout, register, isFirstRun };
