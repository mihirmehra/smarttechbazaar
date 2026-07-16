import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import { CACHE_TAGS } from "@/lib/cache";

// GET all brands (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 50;
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    // Use aggregation to get product counts in a single query (no N+1)
    const [brands, total, productCounts] = await Promise.all([
      Brand.find(query)
        .select("_id name slug description logo website isActive sortOrder")
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Brand.countDocuments(query),
      Product.aggregate([
        { $match: { brand: { $exists: true, $ne: null } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
      ]),
    ]);

    // Create a map for quick lookup
    const countMap = new Map(productCounts.map((p) => [p._id, p.count]));

    const brandsWithCounts = brands.map((brand) => ({
      ...brand,
      productCount: countMap.get(brand.name) || 0,
    }));

    return NextResponse.json({
      brands: brandsWithCounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching brands:", error);
    return NextResponse.json(
      { error: "Failed to fetch brands" },
      { status: 500 }
    );
  }
}

// POST create brand
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    await dbConnect();

    // Generate slug from name
    const slug = data.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    // Check if slug exists
    const existingBrand = await Brand.findOne({ slug });
    if (existingBrand) {
      return NextResponse.json(
        { error: "A brand with this name already exists" },
        { status: 400 }
      );
    }

    const brand = await Brand.create({
      ...data,
      slug,
    });

    // Revalidate brand caches and paths
    revalidateTag(CACHE_TAGS.brands);
    revalidatePath(`/brand/${slug}`);
    revalidatePath("/brands");
    revalidatePath("/");

    return NextResponse.json(
      { message: "Brand created successfully", brand },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating brand:", error);
    return NextResponse.json(
      { error: "Failed to create brand" },
      { status: 500 }
    );
  }
}
