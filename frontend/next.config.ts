// Copyright (c) 2026 HDOS Rwanda. All rights reserved.
import type { NextConfig } from "next";

// BACKEND_URL is used by hosted deployments. NEXT_PUBLIC_API_URL is retained
// for local .env files and older deployment configuration.
const backend = (process.env.BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000")
  .trim()
  .replace(/\/+$/, "");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
};

export default nextConfig;
