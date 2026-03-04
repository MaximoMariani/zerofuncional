/**
 * Called at process start. Throws if any required env var is missing.
 * This ensures Railway deploy fails loudly rather than silently misbehaving.
 */
function validateEnv() {
  const required = [
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
    'TOKEN_ENCRYPTION_KEY',
  ];

  // DB: either DATABASE_URL or the individual vars
  if (!process.env.DATABASE_URL) {
    required.push('DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD');
  }

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Warn (not throw) for Tiendanube vars if provider is tiendanube
  if (process.env.INTEGRATION_PROVIDER === 'tiendanube') {
    const tnRequired = ['TIENDANUBE_CLIENT_ID', 'TIENDANUBE_CLIENT_SECRET', 'TIENDANUBE_REDIRECT_URI'];
    const tnMissing = tnRequired.filter((k) => !process.env[k]);
    if (tnMissing.length > 0) {
      throw new Error(`INTEGRATION_PROVIDER=tiendanube but missing: ${tnMissing.join(', ')}`);
    }
  }
}

module.exports = { validateEnv };
