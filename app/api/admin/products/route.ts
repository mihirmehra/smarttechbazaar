import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { logAdminAction } from "@/lib/activity-logger";
import { CACHE_TAGS } from "@/lib/cache";
import {
  makeUniqueSku,
  makeUniqueSlug,
  duplicateKeyField,
} from "@/lib/product-helpers";

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

    // Use Promise.all for parallel execution and select only needed fields for
    // list view.
    //
    // `images` is deliberately excluded: most products store their images as
    // base64 data URIs in the document (up to 1.6MB each), so including the
    // array here made a 20-item page weigh tens of megabytes and time out.
    // Callers that need a thumbnail should hit
    // /api/admin/products/[id]/thumbnail instead.
    const [products, total] = await Promise.all([
      Product.find()
        .select("_id name slug priceB2C priceB2B mrp stock sku isActive isFeatured category brand createdAt")
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

    // --- Only the product name is strictly required ---
    if (!data.name || !String(data.name).trim()) {
      return NextResponse.json(
        { error: "Product name is required." },
        { status: 400 }
      );
    }

    // The SKU field is fully flexible: whatever is provided (or nothing) is
    // turned into a guaranteed-unique value, so a duplicate SKU can NEVER block
    // a save. Same for the slug.
    let finalSku = await makeUniqueSku(Product, data.sku);
    let finalSlug = await makeUniqueSlug(Product, String(data.name));

    // Create with a retry loop. If a concurrent request grabs the same SKU/slug
    // between our uniqueness check and this insert (the classic race with many
    // people saving at once), we regenerate the clashing value and try again
    // instead of surfacing an error.
    let product;
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        product = await Product.create({
          ...data,
          sku: finalSku,
          slug: finalSlug,
        });
        break;
      } catch (createError: unknown) {
        const dupField = duplicateKeyField(createError);

        if (dupField === "sku") {
          // Regenerate a fresh unique SKU and retry.
          finalSku = await makeUniqueSku(Product, `${finalSku}`);
          continue;
        }
        if (dupField === "slug") {
          finalSlug = await makeUniqueSlug(Product, `${data.name}-${Date.now()}`);
          continue;
        }

        // Surface Mongoose validation errors as a readable 400.
        if (
          typeof createError === "object" &&
          createError !== null &&
          (createError as { name?: string }).name === "ValidationError"
        ) {
          const messages = Object.values(
            (createError as { errors?: Record<string, { message?: string }> }).errors || {}
          )
            .map((e) => e?.message)
            .filter(Boolean)
            .join(" ");
          return NextResponse.json(
            { error: messages || "Some product fields are invalid. Please review and try again." },
            { status: 400 }
          );
        }

        throw createError;
      }
    }

    if (!product) {
      return NextResponse.json(
        {
          error:
            "The product could not be saved after several attempts due to heavy traffic. Please wait a moment and try again.",
        },
        { status: 503 }
      );
    }

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
