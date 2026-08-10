import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Replicate FLUX output images
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
