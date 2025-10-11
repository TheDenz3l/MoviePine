import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors.
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
  // Keep default output; we'll mark layout as dynamic
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.tmdb.org',
        port: '',
        pathname: '/t/p/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    // Avoid bundling optional ws dependencies that cause Critical dependency warnings
    config.resolve = config.resolve || {}
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Realtime uses dynamic require for 'ws' in Node; in edge/browser we don't need it
      ws: false as any,
    }
    return config
  },
};

export default nextConfig;
