import path from "path";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "/QuantumVaultMVP";

/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath,
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:13000/api/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
