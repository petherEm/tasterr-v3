import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable ESLint during builds (for Vercel deployment)
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'mhunmfunhprexlvdfpdm.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
};

export default nextConfig;
