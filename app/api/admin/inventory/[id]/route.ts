import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import InventoryLog from "@/models/InventoryLog";
import { sendEmail, COMPANY_EMAIL } from "@/lib/email";
import { lowStockAlertTemplate } from "@/lib/email-templates";
import { CACHE_TAGS } from "@/lib/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET inventory history for a product
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;

    const [product, logs, total] = await Promise.all([
      Product.findById(id).select("name sku stock images").lean(),
      InventoryLog.find({ product: id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      InventoryLog.countDocuments({ product: id }),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({
      product: JSON.parse(JSON.stringify(product)),
      logs: JSON.parse(JSON.stringify(logs)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error fetching inventory history:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory history" },
      { status: 500 }
    );
  }
}

// PUT - Adjust stock for single product
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { quantity, type, reason, actionType = "adjustment" } = await request.json();

    if (quantity === undefined || quantity === null) {
      return NextResponse.json(
        { error: "Quantity is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Fetch only the fields we need to calculate new stock
    const existing = await Product.findById(id).select("_id name sku stock isActive").lean();

    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const previousStock = existing.stock ?? 0;
    let newStock: number;

    if (type === "set") {
      newStock = quantity;
    } else if (type === "add") {
      newStock = previousStock + quantity;
    } else if (type === "subtract") {
      newStock = previousStock - quantity;
    } else {
      newStock = previousStock + quantity;
    }

    if (newStock < 0) {
      return NextResponse.json(
        { error: "Stock cannot be negative" },
        { status: 400 }
      );
    }

    // Use findByIdAndUpdate with $set so only the stock field is touched —
    // this avoids triggering a full document re-save which could inadvertently
    // modify other fields or cause validation issues.
    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      { $set: { stock: newStock } },
      { new: true }
    ).select("slug");

    // Log the adjustment and revalidate cache in parallel
    await Promise.all([
      InventoryLog.create({
        product: existing._id,
        productName: existing.name,
        productSku: existing.sku,
        actionType,
        quantityChange: newStock - previousStock,
        previousStock,
        newStock,
        reason: reason || "Manual adjustment",
        performedBy: session.user.id,
        performedByName: session.user.name,
      }),
      // Revalidate the products cache so router.refresh() on the page
      // immediately sees the updated stock instead of stale ISR data.
      Promise.resolve(revalidateTag(CACHE_TAGS.products)),
    ]);

    // Revalidate the specific product page if slug is available
    if (updatedProduct?.slug) {
      revalidatePath(`/product/${updatedProduct.slug}`);
    }
    // Revalidate product listing pages
    revalidatePath("/products");

    // Send low stock alert if stock crosses below threshold (10 units)
    const LOW_STOCK_THRESHOLD = 10;
    if (newStock <= LOW_STOCK_THRESHOLD && previousStock > LOW_STOCK_THRESHOLD) {
      const lowStockEmail = lowStockAlertTemplate([
        {
          name: existing.name,
          sku: existing.sku,
          currentStock: newStock,
          reorderLevel: LOW_STOCK_THRESHOLD,
        },
      ]);
      sendEmail({
        to: COMPANY_EMAIL,
        subject: `Low Stock Alert: ${existing.name}`,
        html: lowStockEmail,
      }).catch(console.error); // fire-and-forget, don't block the response
    }

    return NextResponse.json({
      message: "Stock updated successfully",
      product: {
        _id: existing._id,
        sku: existing.sku,
        previousStock,
        newStock,
      },
    });
  } catch (error) {
    console.error("Error updating stock:", error);
    return NextResponse.json(
      { error: "Failed to update stock" },
      { status: 500 }
    );
  }
}
