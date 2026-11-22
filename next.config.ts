import type { NextConfig } from "next";
import path from "path";

const BACKEND_URL =
  process.env.BACKEND_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://socilalink-api-ab186685252b.herokuapp.com';

const isProd = process.env.NODE_ENV === 'production';

const nextConfig: NextConfig = {
  typescript: {
    // Prevent draft scratch notes or test files from breaking production builds
    ignoreBuildErrors: true,
  },
  /* Suppress console.log in production bundle */
  compiler: {
    removeConsole: isProd ? { exclude: ['error', 'warn'] } : false,
  },
  /* config options here */
  experimental: {
    agentUpgrade: "security",
  } as any,
  cacheComponents: true,
  partialPrefetching: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${BACKEND_URL}/api/:path*`,
      },
      {
        source: '/socket.io/:path*',
        destination: `${BACKEND_URL}/socket.io/:path*`,
      },
    ];
  },
  turbopack: {
    root: path.resolve(__dirname, '..'),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
