import { MetadataRoute } from "next";
import { siteConfig } from "@/lib/site-config";

// ============================================================================
// TODO: NOINDEX REMOVAL - Change this to false after adding products/brands
// ============================================================================
const BLOCK_ALL_CRAWLERS = true;

export default function robots(): MetadataRoute.Robots {
  const baseUrl = siteConfig.url;

  // Block all crawlers until site is ready with products
  if (BLOCK_ALL_CRAWLERS) {
    return {
      rules: [
        {
          userAgent: "*",
          disallow: "/",
        },
      ],
      // Still include sitemap for when you're ready
      sitemap: `${baseUrl}/sitemap.xml`,
      host: baseUrl,
    };
  }

  // Original rules - will be used when BLOCK_ALL_CRAWLERS is set to false
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
          "/auth",
          "/auth/*",
          "/cart",
          "/checkout",
          "/checkout/*",
          "/account",
          "/account/*",
          "/wishlist",
          "/orders",
          "/orders/*",
          "/_next",
          "/_next/*",
          "/private",
          "/private/*",
          "/*.json$",
          "/*?*",
        ],
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
          "/auth",
          "/auth/*",
          "/cart",
          "/checkout",
          "/checkout/*",
          "/account",
          "/account/*",
          "/wishlist",
          "/orders",
          "/orders/*",
        ],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/*",
          "/api",
          "/api/*",
          "/auth",
          "/auth/*",
          "/cart",
          "/checkout",
          "/checkout/*",
          "/account",
          "/account/*",
          "/wishlist",
          "/orders",
          "/orders/*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
