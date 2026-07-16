import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { logAdminAction } from "@/lib/activity-logger";
import { CACHE_TAGS } from "@/lib/cache";

// GET all products (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    // Use Promise.all for parallel execution and select only needed fields for list view
    const [products, total] = await Promise.all([
      Product.find()
        .select("_id name slug images priceB2C priceB2B mrp stock sku isActive isFeatured category brand createdAt")
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(),
    ]);

    return NextResponse.json({
      products,
      total,
      page,
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

// POST create product
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
    const existingProduct = await Product.findOne({ slug });
    const finalSlug = existingProduct ? `${slug}-${Date.now()}` : slug;

    const product = await Product.create({
      ...data,
      slug: finalSlug,
    });

    // Log activity
    await logAdminAction(
      session.user.id,
      session.user.name || "Admin",
      session.user.role as "admin" | "super_admin",
      "product_created",
      `Created product: ${data.name}`,
      "product",
      product._id.toString(),
      { productName: data.name, slug: finalSlug }
    );

    // Revalidate product caches and paths
    revalidateTag(CACHE_TAGS.products);
    // Revalidate the specific product cache tag
    revalidateTag(`product-${finalSlug}`);
    // Revalidate the specific product page path
    revalidatePath(`/product/${finalSlug}`);
    // Revalidate product listing pages
    revalidatePath("/products");
    // Revalidate homepage for featured/new products
    revalidatePath("/");

    return NextResponse.json(
      { message: "Product created successfully", product },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
