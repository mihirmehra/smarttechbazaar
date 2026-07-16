import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import { CACHE_TAGS } from "@/lib/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single brand
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const brand = await Brand.findById(id);

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    const productCount = await Product.countDocuments({ brand: brand.name });

    return NextResponse.json({
      brand: { ...brand.toObject(), productCount },
    });
  } catch (error) {
    console.error("Error fetching brand:", error);
    return NextResponse.json(
      { error: "Failed to fetch brand" },
      { status: 500 }
    );
  }
}

// PUT update brand
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    await dbConnect();

    // Get old brand name
    const oldBrand = await Brand.findById(id);
    if (!oldBrand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // If name changed, update slug and update all products
    let updateData = { ...data };
    if (data.name && data.name !== oldBrand.name) {
      const newSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug conflicts with another brand
      const existingBrand = await Brand.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingBrand) {
        return NextResponse.json(
          { error: "A brand with this name already exists" },
          { status: 400 }
        );
      }

      updateData.slug = newSlug;

      // Update all products with old brand name
      await Product.updateMany(
        { brand: oldBrand.name },
        { brand: data.name }
      );
    }

    const brand = await Brand.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    );

    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Revalidate caches and paths
    revalidateTag(CACHE_TAGS.brands);
    revalidateTag(CACHE_TAGS.products);
    revalidatePath(`/brand/${brand.slug}`);
    revalidatePath("/brands");
    revalidatePath("/");

    return NextResponse.json({
      message: "Brand updated successfully",
      brand,
    });
  } catch (error) {
    console.error("Error updating brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand" },
      { status: 500 }
    );
  }
}

// DELETE brand (super_admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only Super Admin can delete brands" },
        { status: 403 }
      );
    }

    await dbConnect();

    const brand = await Brand.findById(id);
    if (!brand) {
      return NextResponse.json({ error: "Brand not found" }, { status: 404 });
    }

    // Check if brand has products
    const productCount = await Product.countDocuments({ brand: brand.name });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete brand with ${productCount} products. Remove brand from products first.` },
        { status: 400 }
      );
    }

    await Brand.findByIdAndDelete(id);

    // Revalidate caches and paths
    revalidateTag(CACHE_TAGS.brands);
    revalidatePath(`/brand/${brand.slug}`);
    revalidatePath("/brands");
    revalidatePath("/");

    return NextResponse.json({ message: "Brand deleted successfully" });
  } catch (error) {
    console.error("Error deleting brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand" },
      { status: 500 }
    );
  }
}
