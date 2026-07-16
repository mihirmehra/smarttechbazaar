import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import { siteConfig } from "@/lib/site-config";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Get counts
    const [productsCount, categoriesCount, brandsCount] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Category.countDocuments({ isActive: true }),
      Brand.countDocuments({ isActive: true }),
    ]);

    // Get products without SEO fields
    const productsWithoutSEO = await Product.countDocuments({
      isActive: true,
      $or: [
        { metaTitle: { $exists: false } },
        { metaTitle: "" },
        { metaDescription: { $exists: false } },
        { metaDescription: "" },
      ],
    });

    // Get products without images
    const productsWithoutImages = await Product.countDocuments({
      isActive: true,
      $or: [
        { images: { $exists: false } },
        { images: { $size: 0 } },
      ],
    });

    // Get categories without descriptions
    const categoriesWithoutDescription = await Category.countDocuments({
      isActive: true,
      $or: [
        { description: { $exists: false } },
        { description: "" },
      ],
    });

    // Get brands without logos
    const brandsWithoutLogo = await Brand.countDocuments({
      isActive: true,
      $or: [
        { logo: { $exists: false } },
        { logo: "" },
      ],
    });

    // Calculate sitemap URL count
    const staticPagesCount = 9; // home, products, brands, about, contact, privacy, terms, shipping, refund
    const totalSitemapUrls = staticPagesCount + productsCount + categoriesCount + brandsCount;

    // Get recent products for sample schema preview
    const recentProducts = await Product.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("name slug metaTitle metaDescription images")
      .lean();

    // Get recent categories
    const recentCategories = await Category.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("name slug description image")
      .lean();

    // Get recent brands
    const recentBrands = await Brand.find({ isActive: true })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("name slug description logo")
      .lean();

    // Generate robots.txt content
    const robotsTxt = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /admin/*
Disallow: /api
Disallow: /api/*
Disallow: /auth
Disallow: /auth/*
Disallow: /cart
Disallow: /checkout
Disallow: /checkout/*
Disallow: /account
Disallow: /account/*
Disallow: /wishlist
Disallow: /orders
Disallow: /orders/*
Disallow: /_next
Disallow: /_next/*

User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /api
Disallow: /auth
Disallow: /cart
Disallow: /checkout
Disallow: /account
Disallow: /wishlist
Disallow: /orders

Sitemap: ${siteConfig.url}/sitemap.xml
Host: ${siteConfig.url}`;

    // SEO health score calculation
    const totalItems = productsCount + categoriesCount + brandsCount;
    const itemsWithIssues = productsWithoutSEO + productsWithoutImages + categoriesWithoutDescription + brandsWithoutLogo;
    const healthScore = totalItems > 0 
      ? Math.round(((totalItems * 2 - itemsWithIssues) / (totalItems * 2)) * 100)
      : 100;

    return NextResponse.json({
      stats: {
        totalProducts: productsCount,
        totalCategories: categoriesCount,
        totalBrands: brandsCount,
        totalSitemapUrls,
        productsWithoutSEO,
        productsWithoutImages,
        categoriesWithoutDescription,
        brandsWithoutLogo,
        healthScore,
      },
      robotsTxt,
      siteConfig: {
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
      },
      recentProducts: JSON.parse(JSON.stringify(recentProducts)),
      recentCategories: JSON.parse(JSON.stringify(recentCategories)),
      recentBrands: JSON.parse(JSON.stringify(recentBrands)),
    });
  } catch (error) {
    console.error("Error fetching SEO data:", error);
    return NextResponse.json(
      { error: "Failed to fetch SEO data" },
      { status: 500 }
    );
  }
}
