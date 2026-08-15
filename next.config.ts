import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // RunPod image output
      { protocol: "https", hostname: "*.runpod.net" },
      { protocol: "https", hostname: "*.runpodcdn.com" },
      // Replicate FLUX output images (kept as fallback)
      { protocol: "https", hostname: "replicate.delivery" },
      { protocol: "https", hostname: "pbxt.replicate.delivery" },
      // Supabase Storage
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  // Silence the Supabase/Zustand "use client" bundling warning
  serverExternalPackages: [],
};

export default nextConfig;
