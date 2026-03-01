import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy app under a subpath
  basePath: '/QuantumVaultMVP',

  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://127.0.0.1:13000/api/v1/:path*', // Proxy to backend
      },
    ];
  },
};

export default nextConfig;
