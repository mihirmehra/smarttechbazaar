import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CouponForm from "@/components/admin/CouponForm";

export default function NewCouponPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/coupons"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="heading-xl">Create Coupon</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Add a new discount coupon
          </p>
        </div>
      </div>

      <CouponForm />
    </div>
  );
}
