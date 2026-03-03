/** @type {import('next').NextConfig} */
const nextConfig = {
  // 'standalone' bundles everything needed to run Next.js into a single
  // self-contained folder (frontend-build/). The Express server in
  // server/index.js loads Next's request handler from that folder.
  output: 'standalone',

  // Since Express serves both API and frontend on the same origin,
  // no NEXT_PUBLIC_API_URL needed in production — requests go to /api/*.
  // The env var is still respected if set (useful for local dev where
  // frontend runs on :3000 and backend on :4000).
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || '',
  },
};

module.exports = nextConfig;
