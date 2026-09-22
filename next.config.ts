import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in C:\Users\ACRESANPAPHAT makes Turbopack infer
  // that as the workspace root instead of this project, which then resolves
  // node_modules from the wrong directory (e.g. "Cannot find module
  // '@vercel/analytics/next'" even though it's installed here). Pin the root
  // explicitly instead of relying on lockfile detection.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
