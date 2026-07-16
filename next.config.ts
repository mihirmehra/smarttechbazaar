import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Enable modern image formats for better compression
    formats: ["image/avif", "image/webp"],
    // Declare allowed quality values (required in Next.js 16+)
    qualities: [50, 60, 70, 75, 80, 85, 90, 95, 100],
    // Optimize image sizing
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ik.imagekit.io",
        pathname: "/sabkatechbazar/**",
      },
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "placehold.co",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Headers for cache control - especially important for mobile app wrappers
  async headers() {
    const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString();
    
    return [
      {
        // API routes should never be cached
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
          {
            key: "X-App-Version",
            value: appVersion,
          },
        ],
      },
      {
        // HTML pages should revalidate frequently for mobile apps
        source: "/((?!_next|api).*)",
        headers: [
          {
            key: "X-App-Version",
            value: appVersion,
          },
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
