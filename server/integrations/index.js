/**
 * ─────────────────────────────────────────────────────────────────
 *  INTEGRATION PROVIDER FACTORY
 *
 *  Reads INTEGRATION_PROVIDER env var (default: "local").
 *  Returns the appropriate provider client.
 *
 *  PROGRAMMER: When you implement Tiendanube, this file will
 *  automatically switch to the real client when
 *  INTEGRATION_PROVIDER=tiendanube is set in .env
 * ─────────────────────────────────────────────────────────────────
 */

const provider = process.env.INTEGRATION_PROVIDER || 'local';

let integrationClient;

if (provider === 'tiendanube') {
  // PROGRAMMER: uncomment once TiendanubeClient is implemented
  // integrationClient = require('./tiendanube/client');
  integrationClient = require('./localProvider');
} else {
  integrationClient = require('./localProvider');
}

module.exports = integrationClient;
