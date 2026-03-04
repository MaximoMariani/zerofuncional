const fetch = require('node-fetch');
const db = require('../../db');
const { encrypt, decrypt } = require('../../utils/crypto');
const logger = require('../../utils/logger');

const TN_API  = 'https://api.tiendanube.com/v1';
const TN_AUTH = 'https://www.tiendanube.com/apps';

// ── OAuth ──────────────────────────────────────────────────────

function getAuthUrl(state = '') {
  const params = new URLSearchParams({
    client_id:     process.env.TIENDANUBE_CLIENT_ID,
    response_type: 'code',
    scope:         'write_orders read_orders',
    state,
  });
  return `${TN_AUTH}/${process.env.TIENDANUBE_CLIENT_ID}/authorize?${params}`;
}

async function exchangeCode(code) {
  const res = await fetch(`${TN_AUTH}/authorize/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id:     process.env.TIENDANUBE_CLIENT_ID,
      client_secret: process.env.TIENDANUBE_CLIENT_SECRET,
      grant_type:    'authorization_code',
      code,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TN token exchange failed: ${res.status} ${body}`);
  }
  return res.json(); // { access_token, token_type, scope, user_id }
}

// ── Token storage ──────────────────────────────────────────────

async function saveTokens({ access_token, user_id, storeName }) {
  await db('store_config').where({ id: 1 }).update({
    provider:            'tiendanube',
    tn_store_id:         String(user_id),
    tn_store_name:       storeName || null,
    tn_access_token_enc: encrypt(access_token),
    updated_at:          new Date(),
  });
}

async function getToken() {
  const cfg = await db('store_config').where({ id: 1 }).first();
  if (!cfg?.tn_access_token_enc) throw new Error('Tiendanube not connected. Visit /admin/integrations/tiendanube');
  return { token: decrypt(cfg.tn_access_token_enc), storeId: cfg.tn_store_id };
}

// ── API calls ──────────────────────────────────────────────────

async function tnFetch(path, options = {}) {
  const { token, storeId } = await getToken();
  const url = `${TN_API}/${storeId}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authentication': `bearer ${token}`,
      'User-Agent':     `ZERO/2.0 (${process.env.TIENDANUBE_CLIENT_ID})`,
      'Content-Type':   'application/json',
      ...options.headers,
    },
  });
  if (res.status === 401) throw new Error('Tiendanube token expired or invalid. Re-authorize in /admin/integrations/tiendanube');
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`TN API ${res.status}: ${body}`);
  }
  return res.json();
}

async function fetchOrders({ limit = 50, page = 1, since_id } = {}) {
  const params = new URLSearchParams({ per_page: limit, page });
  if (since_id) params.set('since_id', since_id);
  return tnFetch(`/orders?${params}`);
}

async function fetchOrder(tnOrderId) {
  return tnFetch(`/orders/${tnOrderId}`);
}

async function getStoreInfo() {
  return tnFetch('/');
}

// ── Status ─────────────────────────────────────────────────────

async function getStatus() {
  const cfg = await db('store_config').where({ id: 1 }).first();
  if (!cfg) return { connected: false };
  const connected = cfg.provider === 'tiendanube' && !!cfg.tn_access_token_enc;
  return {
    connected,
    provider:      cfg.provider,
    tn_store_id:   cfg.tn_store_id,
    tn_store_name: cfg.tn_store_name,
    last_sync_at:  cfg.last_sync_at,
  };
}

module.exports = { getAuthUrl, exchangeCode, saveTokens, fetchOrders, fetchOrder, getStoreInfo, getStatus };
