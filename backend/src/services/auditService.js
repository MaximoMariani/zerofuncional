const db = require('../db');
const logger = require('../utils/logger');

/**
 * Insert an audit log entry.
 * Non-blocking: errors are logged but never thrown to avoid disrupting the main flow.
 *
 * @param {object} params
 * @param {number|null} params.userId
 * @param {string} params.action  - e.g. "order.packed", "scan.ok", "auth.login"
 * @param {string|null} params.entityType - e.g. "order", "scan"
 * @param {number|null} params.entityId
 * @param {object|null} params.metadata
 * @param {string|null} params.ipAddress
 * @param {object|null} params.trx - optional Knex transaction
 */
async function audit({ userId = null, action, entityType = null, entityId = null, metadata = null, ipAddress = null, trx = null }) {
  try {
    const q = trx ? trx('audit_logs') : db('audit_logs');
    await q.insert({
      user_id: userId,
      action,
      entity_type: entityType,
      entity_id: entityId,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ip_address: ipAddress,
    });
  } catch (err) {
    logger.error({ err, action }, 'Failed to write audit log');
  }
}

/**
 * List audit logs with pagination and optional filters.
 */
async function list({ page = 1, limit = 50, userId, action, entityType, entityId } = {}) {
  const offset = (page - 1) * limit;

  let q = db('audit_logs as al')
    .leftJoin('users as u', 'al.user_id', 'u.id')
    .select(
      'al.id', 'al.action', 'al.entity_type', 'al.entity_id',
      'al.metadata', 'al.ip_address', 'al.created_at',
      'u.name as user_name', 'u.email as user_email'
    )
    .orderBy('al.created_at', 'desc')
    .limit(limit)
    .offset(offset);

  if (userId) q = q.where('al.user_id', userId);
  if (action) q = q.where('al.action', 'like', `%${action}%`);
  if (entityType) q = q.where('al.entity_type', entityType);
  if (entityId) q = q.where('al.entity_id', entityId);

  const countQ = db('audit_logs').count('id as total');
  if (userId) countQ.where('user_id', userId);

  const [rows, [{ total }]] = await Promise.all([q, countQ]);

  return {
    data: rows,
    pagination: { page, limit, total: Number(total), pages: Math.ceil(total / limit) },
  };
}

module.exports = { audit, list };
