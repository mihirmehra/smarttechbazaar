import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { logAdminAction } from "@/lib/activity-logger";
import { CACHE_TAGS } from "@/lib/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single product
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const product = await Product.findById(id).populate("category", "name slug");

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

// PUT update product
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    await dbConnect();

    const product = await Product.findByIdAndUpdate(
      id,
      { ...data, updatedAt: new Date() },
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Log activity
    await logAdminAction(
      session.user.id,
      session.user.name || "Admin",
      session.user.role as "admin" | "super_admin",
      "product_updated",
      `Updated product: ${product.name}`,
      "product",
      id,
      { productName: product.name }
    );

    // Revalidate product caches and paths
    revalidateTag(CACHE_TAGS.products);
    // Revalidate the specific product cache tag
    revalidateTag(`product-${product.slug}`);
    // Revalidate the specific product page
    revalidatePath(`/product/${product.slug}`);
    // Revalidate product listing pages
    revalidatePath("/products");
    // Revalidate homepage for featured/new products
    revalidatePath("/");

    return NextResponse.json({
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

// DELETE product
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Log activity
    await logAdminAction(
      session.user.id,
      session.user.name || "Admin",
      session.user.role as "admin" | "super_admin",
      "product_deleted",
      `Deleted product: ${product.name}`,
      "product",
      id,
      { productName: product.name }
    );

    // Revalidate product caches and paths
    revalidateTag(CACHE_TAGS.products);
    // Revalidate the specific product cache tag
    revalidateTag(`product-${product.slug}`);
    // Revalidate the specific product page
    revalidatePath(`/product/${product.slug}`);
    // Revalidate product listing pages
    revalidatePath("/products");
    // Revalidate homepage for featured/new products
    revalidatePath("/");

    return NextResponse.json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
