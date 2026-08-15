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
  // Silence the Supabase/Zustand "use client" bundling warning
  serverExternalPackages: [],
};

export default nextConfig;
