import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import InventoryLog from "@/models/InventoryLog";

// GET inventory overview
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
    const filter = searchParams.get("filter") || "";
    const sort = searchParams.get("sort") || "stock-asc";

    // Use isActive: { $ne: false } to include products without isActive field
    const query: Record<string, unknown> = { isActive: { $ne: false } };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { sku: { $regex: search, $options: "i" } },
      ];
    }

    if (filter === "out-of-stock") {
      query.stock = { $in: [0, null, undefined] };
    } else if (filter === "low-stock") {
      query.stock = { $gt: 0, $lt: 10 };
    } else if (filter === "in-stock") {
      query.stock = { $gte: 10 };
    }

    // Sort options
    let sortOption: Record<string, 1 | -1> = { stock: 1 };
    if (sort === "stock-desc") {
      sortOption = { stock: -1 };
    } else if (sort === "name-asc") {
      sortOption = { name: 1 };
    } else if (sort === "name-desc") {
      sortOption = { name: -1 };
    } else if (sort === "sku-asc") {
      sortOption = { sku: 1 };
    }

    const [products, total, stats] = await Promise.all([
      Product.find(query)
        .select("_id name sku stock images priceB2C priceB2B")
        .populate("category", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      getInventoryStats(),
    ]);

    return NextResponse.json({
      products: JSON.parse(JSON.stringify(products)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    });
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 }
    );
  }
}

async function getInventoryStats() {
  // Use aggregation to get all stats in a single query for better performance
  const stats = await Product.aggregate([
    { $match: { isActive: { $ne: false } } },
    {
      $facet: {
        total: [{ $count: "count" }],
        outOfStock: [{ $match: { $or: [{ stock: 0 }, { stock: null }, { stock: { $exists: false } }] } }, { $count: "count" }],
        lowStock: [{ $match: { stock: { $gt: 0, $lt: 10 } } }, { $count: "count" }],
        totalValue: [{ $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ["$stock", 0] }, { $ifNull: ["$priceB2C", 0] }] } } } }],
      },
    },
  ]);

  const result = stats[0] || {};
  const totalProducts = result.total?.[0]?.count || 0;
  const outOfStock = result.outOfStock?.[0]?.count || 0;
  const lowStock = result.lowStock?.[0]?.count || 0;

  return {
    totalProducts,
    outOfStock,
    lowStock,
    inStock: totalProducts - outOfStock - lowStock,
    totalValue: result.totalValue?.[0]?.total || 0,
  };
}

// POST - Bulk stock adjustment
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { adjustments, reason } = await request.json();

    if (!adjustments || !Array.isArray(adjustments) || adjustments.length === 0) {
      return NextResponse.json(
        { error: "No adjustments provided" },
        { status: 400 }
      );
    }

    await dbConnect();

    const results = {
      success: [] as string[],
      failed: [] as { sku: string; error: string }[],
    };

    for (const adj of adjustments) {
      try {
        const product = await Product.findById(adj.productId);

        if (!product) {
          results.failed.push({ sku: adj.sku || adj.productId, error: "Product not found" });
          continue;
        }

        const previousStock = product.stock;
        const newStock = adj.type === "set"
          ? adj.quantity
          : previousStock + adj.quantity;

        if (newStock < 0) {
          results.failed.push({ sku: product.sku, error: "Stock cannot be negative" });
          continue;
        }

        product.stock = newStock;
        await product.save();

        // Log the adjustment
        await InventoryLog.create({
          product: product._id,
          productName: product.name,
          productSku: product.sku,
          actionType: "adjustment",
          quantityChange: newStock - previousStock,
          previousStock,
          newStock,
          reason: reason || "Manual adjustment",
          performedBy: session.user.id,
          performedByName: session.user.name,
        });

        results.success.push(product.sku);
      } catch (error) {
        results.failed.push({
          sku: adj.sku || adj.productId,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return NextResponse.json({
      message: `Adjusted ${results.success.length} products`,
      results,
    });
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    return NextResponse.json(
      { error: "Failed to adjust inventory" },
      { status: 500 }
    );
  }
}
