import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "csv";
    const category = searchParams.get("category");

    // Build query
    const query: Record<string, unknown> = {};
    if (category) {
      query.category = category;
    }

    // Get products with category populated
    const products = await Product.find(query)
      .populate("category", "name")
      .lean();

    if (format === "json") {
      // Return JSON format
      return NextResponse.json({
        products: products.map(p => ({
          name: p.name,
          slug: p.slug,
          sku: p.sku,
          description: p.description,
          shortDescription: p.shortDescription || "",
          category: (p.category as unknown as { name: string } | null)?.name || "",
          brand: p.brand || "",
          priceB2C: p.priceB2C,
          priceB2B: p.priceB2B,
          mrp: p.mrp,
          stock: p.stock,
          minOrderQty: p.minOrderQty,
          maxOrderQty: p.maxOrderQty || "",
          unit: p.unit,
          weight: p.weight || "",
          isActive: p.isActive,
          isFeatured: p.isFeatured,
          isNewArrival: p.isNewArrival,
          isBestSeller: p.isBestSeller,
          tags: (p.tags || []).join(", "),
          images: (p.images || []).join(", "),
        })),
        exportedAt: new Date().toISOString(),
        totalProducts: products.length,
      });
    }

    // Build CSV
    const headers = [
      "name",
      "slug",
      "sku",
      "description",
      "shortDescription",
      "category",
      "brand",
      "priceB2C",
      "priceB2B",
      "mrp",
      "stock",
      "minOrderQty",
      "maxOrderQty",
      "unit",
      "weight",
      "isActive",
      "isFeatured",
      "isNewArrival",
      "isBestSeller",
      "tags",
      "images",
    ];

    const escapeCSV = (value: string | number | boolean | null | undefined): string => {
      if (value === null || value === undefined) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = products.map((p) => [
      escapeCSV(p.name),
      escapeCSV(p.slug),
      escapeCSV(p.sku),
      escapeCSV(p.description),
      escapeCSV(p.shortDescription),
      escapeCSV((p.category as unknown as { name: string } | null)?.name),
      escapeCSV(p.brand),
      escapeCSV(p.priceB2C),
      escapeCSV(p.priceB2B),
      escapeCSV(p.mrp),
      escapeCSV(p.stock),
      escapeCSV(p.minOrderQty),
      escapeCSV(p.maxOrderQty),
      escapeCSV(p.unit),
      escapeCSV(p.weight),
      escapeCSV(p.isActive),
      escapeCSV(p.isFeatured),
      escapeCSV(p.isNewArrival),
      escapeCSV(p.isBestSeller),
      escapeCSV((p.tags || []).join("; ")),
      escapeCSV((p.images || []).join("; ")),
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="products-export-${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exporting products:", error);
    return NextResponse.json(
      { error: "Failed to export products" },
      { status: 500 }
    );
  }
}
