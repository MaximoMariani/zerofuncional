const fs   = require('fs');
const path = require('path');

const ROOT           = path.join(__dirname, '..');
const STANDALONE     = path.join(ROOT, 'frontend', '.next', 'standalone');
const STATIC         = path.join(ROOT, 'frontend', '.next', 'static');
const PUBLIC         = path.join(ROOT, 'frontend', 'public');
const DEST           = path.join(ROOT, 'frontend-build');

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    entry.isDirectory() ? copyDir(s, d) : fs.copyFileSync(s, d);
  }
}

if (!fs.existsSync(STANDALONE)) {
  console.error('❌ frontend/.next/standalone not found. Make sure next.config.js has output:"standalone"');
  process.exit(1);
}

console.log('📦 Copying Next.js standalone build → frontend-build/');
if (fs.existsSync(DEST)) fs.rmSync(DEST, { recursive: true });

copyDir(STANDALONE, DEST);
copyDir(STATIC, path.join(DEST, '.next', 'static'));
if (fs.existsSync(PUBLIC)) copyDir(PUBLIC, path.join(DEST, 'public'));

console.log('✅ frontend-build ready');
