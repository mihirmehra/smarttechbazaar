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
    // Tree-shake barrel-file packages so a single icon import doesn't pull in
    // the entire library. Meaningfully reduces client JS on every page.
    optimizePackageImports: [
      "lucide-react",
      "date-fns",
      "recharts",
      "framer-motion",
    ],
  },
  // Drop console.* from client bundles in production (keeps errors/warnings).
  compiler: {
    removeConsole:
      process.env.NODE_ENV === "production"
        ? { exclude: ["error", "warn"] }
        : false,
  },
  // Headers for cache control - especially important for mobile app wrappers
  async headers() {
    const appVersion = process.env.VERCEL_GIT_COMMIT_SHA || Date.now().toString();
    
    return [
      {
        // Baseline hardening for every response
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        // Immutable static assets can be cached forever
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
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
        // Private/authenticated areas must never be cached by the CDN or browser.
        source: "/(dashboard|admin|cart|checkout|order-success)/:path*",
        headers: [
          {
            key: "X-App-Version",
            value: appVersion,
          },
          {
            key: "Cache-Control",
            value: "private, no-store, must-revalidate",
          },
        ],
      },
      {
        // Public pages: allow the Vercel CDN to serve cached HTML instead of
        // hitting the origin on every request. This is the single biggest
        // reducer of Fast Origin Transfer. The browser always revalidates
        // (max-age=0) but the shared CDN can serve a cached copy for a while
        // and refresh it in the background (stale-while-revalidate).
        // Content changes made in the admin still appear immediately because
        // mutations call revalidateTag().
        source: "/((?!_next|api|dashboard|admin|cart|checkout|order-success).*)",
        headers: [
          {
            key: "X-App-Version",
            value: appVersion,
          },
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
