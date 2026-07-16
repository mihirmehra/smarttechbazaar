import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ShippingRateForm from "@/components/admin/ShippingRateForm";

export default function NewShippingRatePage() {
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
          <h1 className="heading-xl">New Shipping Rate</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Add a new shipping rate for a location
          </p>
        </div>
      </div>

      <ShippingRateForm />
    </div>
  );
}
