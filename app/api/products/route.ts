import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const search = searchParams.get("search") || "";
    const categories = searchParams.get("categories")?.split(",").filter(Boolean) || [];
    const brands = searchParams.get("brands")?.split(",").filter(Boolean) || [];
    const priceMin = Number(searchParams.get("priceMin")) || 0;
    const priceMax = Number(searchParams.get("priceMax")) || 1000000;
    const inStock = searchParams.get("inStock") === "true";
    const onSale = searchParams.get("onSale") === "true";
    const featured = searchParams.get("featured") === "true";
    const newArrivals = searchParams.get("newArrivals") === "true";
    const bestSeller = searchParams.get("bestSeller") === "true";
    const tags = searchParams.get("tags")?.split(",").filter(Boolean) || [];
    const sortBy = searchParams.get("sortBy") || "relevance";
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    // Build query
    const query: Record<string, unknown> = { isActive: true };

    // Text search
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { tags: { $in: [new RegExp(search, "i")] } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    // Category filter
    if (categories.length > 0) {
      query.category = { $in: categories };
    }

    // Brand filter (brand is stored as a string in Product model)
    // Supports both brand IDs and brand names
    if (brands.length > 0) {
      // Check if brands are IDs (ObjectId format) or names
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(brands[0]);
      
      if (isObjectId) {
        // Fetch brand names by IDs
        const Brand = (await import("@/models/Brand")).default;
        const brandDocs = await Brand.find({ _id: { $in: brands } }).lean();
        const brandNames = brandDocs.map((b) => b.name);
        if (brandNames.length > 0) {
          query.brand = { $in: brandNames };
        }
      } else {
        // Brands are already names
        query.brand = { $in: brands };
      }
    }

    // Price filter (use priceB2C for filtering)
    if (priceMin > 0 || priceMax < 1000000) {
      query.priceB2C = { $gte: priceMin, $lte: priceMax };
    }

    // Stock filter
    if (inStock) {
      query.stock = { $gt: 0 };
    }

    // Sale filter (products where mrp > priceB2C)
    if (onSale) {
      query.$expr = { $gt: ["$mrp", "$priceB2C"] };
    }

    // Featured filter
    if (featured) {
      query.isFeatured = true;
    }

    // New arrivals filter
    if (newArrivals) {
      query.isNewArrival = true;
    }

    // Best seller filter
    if (bestSeller) {
      query.isBestSeller = true;
    }

    // Tags filter
    if (tags.length > 0) {
      query.tags = { $in: tags };
    }

    // Build sort
    let sort: Record<string, 1 | -1> = { createdAt: -1 };
    switch (sortBy) {
      case "price-asc":
        sort = { priceB2C: 1 };
        break;
      case "price-desc":
        sort = { priceB2C: -1 };
        break;
      case "newest":
        sort = { createdAt: -1 };
        break;
      case "bestselling":
        sort = { soldCount: -1 };
        break;
      case "name-asc":
        sort = { name: 1 };
        break;
      case "name-desc":
        sort = { name: -1 };
        break;
      default:
        sort = { isFeatured: -1, createdAt: -1 };
    }

    // Execute query with optimized projection
    const skip = (page - 1) * limit;
    const [products, total] = await Promise.all([
      Product.find(query)
        .select("_id name slug images priceB2C priceB2B mrp stock brand sku category isFeatured isNewArrival")
        .populate("category", "name slug")
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
    ]);

    return NextResponse.json({
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
