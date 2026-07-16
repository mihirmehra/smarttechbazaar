import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import dbConnect from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import CouponForm from "@/components/admin/CouponForm";

interface EditCouponPageProps {
  params: Promise<{ id: string }>;
}

async function getCoupon(id: string) {
  try {
    await dbConnect();
    const coupon = await Coupon.findById(id).lean();
    if (!coupon) return null;
    return JSON.parse(JSON.stringify(coupon));
  } catch (error) {
    console.error("Error fetching coupon:", error);
    return null;
  }
}

export default async function EditCouponPage({ params }: EditCouponPageProps) {
  const { id } = await params;
  const coupon = await getCoupon(id);

  if (!coupon) {
    notFound();
  }

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
          <h1 className="heading-xl">Edit Coupon</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Update coupon: <span className="font-mono font-semibold text-primary">{coupon.code}</span>
          </p>
        </div>
      </div>

      <CouponForm coupon={coupon} />
    </div>
  );
}
