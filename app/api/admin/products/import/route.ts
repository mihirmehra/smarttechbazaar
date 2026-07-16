import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";

interface ImportProduct {
  name: string;
  slug?: string;
  sku: string;
  description: string;
  shortDescription?: string;
  category: string;
  brand?: string;
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  stock: number;
  minOrderQty?: number;
  maxOrderQty?: number;
  unit?: string;
  weight?: number;
  isActive?: boolean;
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  tags?: string;
  images?: string;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();
    const { products, mode = "create" } = data; // mode: 'create', 'update', 'upsert'

    if (!products || !Array.isArray(products)) {
      return NextResponse.json({ error: "Products array is required" }, { status: 400 });
    }

    await dbConnect();

    // Get all categories for lookup
    const categories = await Category.find().lean();
    const categoryMap = new Map(
      categories.map((c) => [c.name.toLowerCase(), c._id.toString()])
    );

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: [] as { row: number; sku: string; error: string }[],
    };

    for (let i = 0; i < products.length; i++) {
      const productData = products[i] as ImportProduct;
      
      try {
        // Validate required fields
        if (!productData.name || !productData.sku) {
          results.errors.push({ row: i + 1, sku: productData.sku || "N/A", error: "Name and SKU are required" });
          results.skipped++;
          continue;
        }

        // Find category
        const categoryId = categoryMap.get(productData.category?.toLowerCase() || "");
        if (!categoryId) {
          results.errors.push({ row: i + 1, sku: productData.sku, error: `Category "${productData.category}" not found` });
          results.skipped++;
          continue;
        }

        // Generate slug if not provided
        const slug = productData.slug || productData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

        // Parse tags and images
        const tags = productData.tags 
          ? productData.tags.split(/[,;]/).map((t: string) => t.trim()).filter(Boolean)
          : [];
        const images = productData.images
          ? productData.images.split(/[,;]/).map((i: string) => i.trim()).filter(Boolean)
          : [];

        // Check for existing product
        const existingProduct = await Product.findOne({ sku: productData.sku.toUpperCase() });

        if (existingProduct) {
          if (mode === "create") {
            results.errors.push({ row: i + 1, sku: productData.sku, error: "Product already exists (use upsert mode)" });
            results.skipped++;
            continue;
          }

          // Update existing product
          await Product.findByIdAndUpdate(existingProduct._id, {
            name: productData.name,
            slug,
            description: productData.description || existingProduct.description,
            shortDescription: productData.shortDescription || existingProduct.shortDescription,
            category: categoryId,
            brand: productData.brand || existingProduct.brand,
            priceB2C: productData.priceB2C || existingProduct.priceB2C,
            priceB2B: productData.priceB2B || existingProduct.priceB2B,
            mrp: productData.mrp || existingProduct.mrp,
            stock: productData.stock ?? existingProduct.stock,
            minOrderQty: productData.minOrderQty || existingProduct.minOrderQty,
            maxOrderQty: productData.maxOrderQty || existingProduct.maxOrderQty,
            unit: productData.unit || existingProduct.unit,
            weight: productData.weight || existingProduct.weight,
            isActive: productData.isActive ?? existingProduct.isActive,
            isFeatured: productData.isFeatured ?? existingProduct.isFeatured,
            isNewArrival: productData.isNewArrival ?? existingProduct.isNewArrival,
            isBestSeller: productData.isBestSeller ?? existingProduct.isBestSeller,
            tags: tags.length > 0 ? tags : existingProduct.tags,
            images: images.length > 0 ? images : existingProduct.images,
          });
          results.updated++;
        } else {
          if (mode === "update") {
            results.errors.push({ row: i + 1, sku: productData.sku, error: "Product not found (use upsert mode)" });
            results.skipped++;
            continue;
          }

          // Create new product
          await Product.create({
            name: productData.name,
            slug,
            sku: productData.sku.toUpperCase(),
            description: productData.description || "No description",
            shortDescription: productData.shortDescription,
            category: categoryId,
            brand: productData.brand,
            priceB2C: productData.priceB2C || 0,
            priceB2B: productData.priceB2B || 0,
            mrp: productData.mrp || 0,
            stock: productData.stock || 0,
            minOrderQty: productData.minOrderQty || 1,
            maxOrderQty: productData.maxOrderQty,
            unit: productData.unit || "piece",
            weight: productData.weight,
            isActive: productData.isActive ?? true,
            isFeatured: productData.isFeatured ?? false,
            isNewArrival: productData.isNewArrival ?? false,
            isBestSeller: productData.isBestSeller ?? false,
            tags,
            images,
          });
          results.created++;
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        results.errors.push({ row: i + 1, sku: productData.sku || "N/A", error: errorMessage });
        results.skipped++;
      }
    }

    return NextResponse.json({
      message: "Import completed",
      results,
    });
  } catch (error) {
    console.error("Error importing products:", error);
    return NextResponse.json(
      { error: "Failed to import products" },
      { status: 500 }
    );
  }
}
