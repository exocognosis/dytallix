const { loadEnvConfig } = require('@next/env');

loadEnvConfig(process.cwd());

/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || '';

const nextConfig = {
  output: 'standalone',
  basePath,
  assetPrefix: basePath || undefined,
  images: {
    domains: ['lh3.googleusercontent.com'],
  },
};

module.exports = nextConfig;
