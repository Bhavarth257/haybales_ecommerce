import type { NextConfig } from 'next';

// Static export: the whole app is client-rendered HTML/JS served from Amplify (or S3 + CloudFront).
// Detail pages use ?id= query params instead of [id] routes, which static export can't serve.
const nextConfig: NextConfig = {
  output: 'export',
  devIndicators: false, // hide the Next.js "N" badge in local dev
  // NEXT_DIST_DIR=out lets a build run beside `next dev` (which owns .next); export then lands in that dir.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: { unoptimized: true },
  trailingSlash: true,
  transpilePackages: ['@parali/shared'],
  turbopack: {
    rules: { '*.css': { loaders: ['@tailwindcss/turbopack'], as: '*.css' } },
  },
};

export default nextConfig;
