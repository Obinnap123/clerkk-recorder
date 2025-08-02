import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
    unoptimized: true
  },
  turbopack: {
    rules: {
      '**/*.{png,jpg,jpeg,gif,svg}': ['asset']
    }
  }
};

export default nextConfig;
