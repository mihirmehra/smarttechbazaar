import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { CACHE_TAGS } from "@/lib/cache";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET single category
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const category = await Category.findById(id).populate("parent", "name slug");

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    const productCount = await Product.countDocuments({ category: id });
    const subcategories = await Category.find({ parent: id }).lean();

    return NextResponse.json({
      category: { ...category.toObject(), productCount },
      subcategories,
    });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

// PUT update category
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    await dbConnect();

    // Check if trying to set parent to itself
    if (data.parent === id) {
      return NextResponse.json(
        { error: "Category cannot be its own parent" },
        { status: 400 }
      );
    }

    // If name changed, update slug
    let updateData = { ...data };
    if (data.name) {
      const newSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      // Check if new slug conflicts with another category
      const existingCategory = await Category.findOne({
        slug: newSlug,
        _id: { $ne: id },
      });

      if (existingCategory) {
        return NextResponse.json(
          { error: "A category with this name already exists" },
          { status: 400 }
        );
      }

      updateData.slug = newSlug;
    }

    const category = await Category.findByIdAndUpdate(
      id,
      { ...updateData, updatedAt: new Date() },
      { new: true }
    ).populate("parent", "name slug");

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Revalidate caches and paths
    revalidateTag(CACHE_TAGS.categories);
    revalidatePath(`/category/${category.slug}`);
    revalidatePath("/");

    return NextResponse.json({
      message: "Category updated successfully",
      category,
    });
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE category (super_admin only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only Super Admin can delete categories" },
        { status: 403 }
      );
    }

    await dbConnect();

    // Check if category has products
    const productCount = await Product.countDocuments({ category: id });
    if (productCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${productCount} products. Move or delete products first.` },
        { status: 400 }
      );
    }

    // Check if category has subcategories
    const subcategories = await Category.countDocuments({ parent: id });
    if (subcategories > 0) {
      return NextResponse.json(
        { error: `Cannot delete category with ${subcategories} subcategories. Delete subcategories first.` },
        { status: 400 }
      );
    }

    const category = await Category.findByIdAndDelete(id);

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    // Revalidate caches and paths
    revalidateTag(CACHE_TAGS.categories);
    revalidatePath(`/category/${category.slug}`);
    revalidatePath("/");

    return NextResponse.json({ message: "Category deleted successfully" });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
