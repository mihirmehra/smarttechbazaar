import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import BrandForm from "@/components/admin/BrandForm";

interface EditBrandPageProps {
  params: Promise<{ id: string }>;
}

async function getBrand(id: string) {
  try {
    await dbConnect();
    const brand = await Brand.findById(id).lean();

    if (!brand) return null;
    return JSON.parse(JSON.stringify(brand));
  } catch (error) {
    console.error("Error fetching brand:", error);
    return null;
  }
}

export default async function EditBrandPage({ params }: EditBrandPageProps) {
  const { id } = await params;
  const brand = await getBrand(id);

  if (!brand) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/brands"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="heading-xl">Edit Brand</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Update brand: {brand.name}
          </p>
        </div>
      </div>

      <BrandForm brand={brand} isEdit />
    </div>
  );
}
