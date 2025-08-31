// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    optimizeCss: false, // LightningCSS を無効化
  },
};

export default nextConfig;
