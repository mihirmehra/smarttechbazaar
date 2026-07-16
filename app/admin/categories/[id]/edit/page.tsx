import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import CategoryForm from "@/components/admin/CategoryForm";

interface EditCategoryPageProps {
  params: Promise<{ id: string }>;
}

async function getCategory(id: string) {
  try {
    await dbConnect();
    const category = await Category.findById(id)
      .populate("parent", "_id name")
      .lean();

    if (!category) return null;
    return JSON.parse(JSON.stringify(category));
  } catch (error) {
    console.error("Error fetching category:", error);
    return null;
  }
}

async function getAllCategories(excludeId: string) {
  try {
    await dbConnect();
    const categories = await Category.find({
      isActive: true,
      _id: { $ne: excludeId },
    })
      .select("_id name")
      .sort({ name: 1 })
      .lean();
    return JSON.parse(JSON.stringify(categories));
  } catch (error) {
    console.error("Error fetching categories:", error);
    return [];
  }
}

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const { id } = await params;
  const [category, allCategories] = await Promise.all([
    getCategory(id),
    getAllCategories(id),
  ]);

  if (!category) {
    notFound();
  }

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
          <h1 className="heading-xl">Edit Category</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Update category: {category.name}
          </p>
        </div>
      </div>

      <CategoryForm category={category} allCategories={allCategories} isEdit />
    </div>
  );
}
