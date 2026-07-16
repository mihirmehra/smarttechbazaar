import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import ShippingRate from "@/models/ShippingRate";
import ShippingRateForm from "@/components/admin/ShippingRateForm";

interface EditShippingRatePageProps {
  params: Promise<{ id: string }>;
}

async function getShippingRate(id: string) {
  try {
    await dbConnect();
    const rate = await ShippingRate.findById(id).lean();

    if (!rate) {
      return null;
    }

    return JSON.parse(JSON.stringify({
      ...rate,
      _id: rate._id.toString(),
    }));
  } catch (error) {
    console.error("Error fetching shipping rate:", error);
    return null;
  }
}

export default async function EditShippingRatePage({ params }: EditShippingRatePageProps) {
  const { id } = await params;
  const rate = await getShippingRate(id);

  if (!rate) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/admin/shipping"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="heading-xl">Edit Shipping Rate</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Update: {rate.name}
          </p>
        </div>
      </div>

      <ShippingRateForm rate={rate} isEdit />
    </div>
  );
}
