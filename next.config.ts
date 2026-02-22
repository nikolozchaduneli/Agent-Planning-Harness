import type { NextConfig } from "next";
import path from "path";

process.chdir(__dirname);

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  outputFileTracingRoot: __dirname,
  webpack: (config) => {
    config.resolve = config.resolve || {};
    const existing = config.resolve.modules || [];
    config.resolve.modules = [
      path.join(__dirname, "node_modules"),
      ...existing,
      "node_modules",
    ];
    return config;
  },
};

export default nextConfig;
