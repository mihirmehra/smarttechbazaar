import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import CategoryForm from "@/components/admin/CategoryForm";

async function getAllCategories() {
  try {
    await dbConnect();
    const categories = await Category.find({ isActive: true })
      .select("_id name")
      .sort({ name: 1 })
      .lean();
    return JSON.parse(JSON.stringify(categories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export default async function NewCategoryPage() {
  const allCategories = await getAllCategories();

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/categories"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="heading-xl">New Category</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Create a new product category
          </p>
        </div>
      </div>

      <CategoryForm allCategories={allCategories} />
    </div>
  );
}
