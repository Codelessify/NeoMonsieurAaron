import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // RunPod image output
      { protocol: "https", hostname: "*.runpod.net" },
      { protocol: "https", hostname: "*.runpodcdn.com" },
      { protocol: "https", hostname: "image.runpod.ai" },
      // Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Prevent browser caching of HTML pages so users always get the latest build
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "Cache-Control", value: "no-store, no-cache, must-revalidate, proxy-revalidate" },
        { key: "Pragma", value: "no-cache" },
        { key: "Expires", value: "0" },
      ],
    },
  ],
  // Silence the Supabase/Zustand "use client" bundling warning
  serverExternalPackages: [],
};

export default nextConfig;
