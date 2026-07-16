import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { logAdminAction } from "@/lib/activity-logger";
import { CACHE_TAGS } from "@/lib/cache";

// GET all categories (admin)
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
    const parent = searchParams.get("parent");

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    if (parent === "root") {
      query.parent = null;
    } else if (parent) {
      query.parent = parent;
    }

    // Use aggregation to get product counts in a single query (no N+1)
    const [categories, total, productCounts] = await Promise.all([
      Category.find(query)
        .select("_id name slug description image parent isActive sortOrder")
        .populate("parent", "name slug")
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(query),
      Product.aggregate([
        { $match: { category: { $exists: true, $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
    ]);

    // Create a map for quick lookup
    const countMap = new Map(productCounts.map((p) => [p._id.toString(), p.count]));

    const categoriesWithCounts = categories.map((cat) => ({
      ...cat,
      productCount: countMap.get(cat._id.toString()) || 0,
    }));

    return NextResponse.json({
      categories: categoriesWithCounts,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST create category
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
    const existingCategory = await Category.findOne({ slug });
    if (existingCategory) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 400 }
      );
    }

    const category = await Category.create({
      ...data,
      slug,
      parent: data.parent || null,
    });

    // Log activity
    await logAdminAction(
      session.user.id,
      session.user.name || "Admin",
      session.user.role as "admin" | "super_admin",
      "category_created",
      `Created category: ${data.name}`,
      "category",
      category._id.toString(),
      { categoryName: data.name, slug }
    );

    // Revalidate caches and paths
    revalidateTag(CACHE_TAGS.categories);
    revalidatePath(`/category/${slug}`);
    revalidatePath("/");

    return NextResponse.json(
      { message: "Category created successfully", category },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
