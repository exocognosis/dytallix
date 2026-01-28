import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Deploy app under a subpath
  // Deploy app under a subpath
  // basePath: '/QuantumVaultMVP',
  // Ensure assets load correctly
  // Ensure assets load correctly

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
