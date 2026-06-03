import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // De kennisbank is verhuisd van /help naar /kennisbank (308, SEO behouden).
      { source: "/help", destination: "/kennisbank", permanent: true },
    ];
  },
};

export default nextConfig;
