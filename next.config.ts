import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ensure API routes are always dynamic (important for in-memory store on Vercel)
  experimental: {},
};

export default nextConfig;
