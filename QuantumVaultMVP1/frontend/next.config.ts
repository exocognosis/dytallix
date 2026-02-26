import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: '/QuantumVaultMVP',
  turbopack: {
    root: __dirname,
  },

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:13000/api/v1/:path*', // Proxy to backend
      },
    ];
  },
};

export default nextConfig;
