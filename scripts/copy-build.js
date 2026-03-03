/**
 * Post-build script: copies the Next.js standalone output into frontend-build/
 * so the Express server can find it at a predictable path.
 *
 * Next.js standalone output (after `next build` with output:'standalone'):
 *   frontend/.next/standalone/          → frontend-build/
 *   frontend/.next/static/              → frontend-build/.next/static/
 *   frontend/public/                    → frontend-build/public/
 *
 * Run automatically by: npm run build
 */
const fs   = require('fs');
const path = require('path');

const ROOT     = path.join(__dirname, '..');
const SRC_STANDALONE = path.join(ROOT, 'frontend', '.next', 'standalone');
const SRC_STATIC     = path.join(ROOT, 'frontend', '.next', 'static');
const SRC_PUBLIC     = path.join(ROOT, 'frontend', 'public');
const DEST           = path.join(ROOT, 'frontend-build');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

console.log('📦 Copying Next.js standalone build → frontend-build/');

if (!fs.existsSync(SRC_STANDALONE)) {
  console.error('❌ frontend/.next/standalone not found.');
  console.error('   Make sure next.config.js has output: "standalone"');
  process.exit(1);
}

// 1. Copy standalone server + bundled node_modules
copyDir(SRC_STANDALONE, DEST);
console.log('   ✓ standalone server');

// 2. Copy hashed static assets
copyDir(SRC_STATIC, path.join(DEST, '.next', 'static'));
console.log('   ✓ .next/static');

// 3. Copy public assets (if any)
if (fs.existsSync(SRC_PUBLIC)) {
  copyDir(SRC_PUBLIC, path.join(DEST, 'public'));
  console.log('   ✓ public/');
}

console.log('✅ frontend-build/ ready');
