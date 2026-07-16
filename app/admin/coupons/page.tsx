import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import {
  Tag,
  Percent,
  IndianRupee,
  Calendar,
  Plus,
  Eye,
  Edit,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import DeleteCouponButton from "@/components/admin/DeleteCouponButton";

interface CouponsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getCoupons(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const page = Number(searchParams.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = searchParams.status as string;

    const query: Record<string, unknown> = {};
    const now = new Date();

    if (status === "active") {
      query.isActive = true;
      query.validFrom = { $lte: now };
      query.validUntil = { $gte: now };
    } else if (status === "inactive") {
      query.isActive = false;
    } else if (status === "expired") {
      query.validUntil = { $lt: now };
    } else if (status === "upcoming") {
      query.validFrom = { $gt: now };
    }

    if (searchParams.search) {
      query.$or = [
        { code: { $regex: searchParams.search, $options: "i" } },
        { description: { $regex: searchParams.search, $options: "i" } },
      ];
    }

    const [coupons, total, stats] = await Promise.all([
      Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name")
        .lean(),
      Coupon.countDocuments(query),
      getCouponStats(),
    ]);

    return {
      coupons: JSON.parse(JSON.stringify(coupons)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return {
      coupons: [],
      total: 0,
      page: 1,
      totalPages: 1,
      stats: { totalCoupons: 0, activeCoupons: 0, expiredCoupons: 0, inactiveCoupons: 0 },
    };
  }
}

async function getCouponStats() {
  const now = new Date();
  const [totalCoupons, activeCoupons, expiredCoupons] = await Promise.all([
    Coupon.countDocuments(),
    Coupon.countDocuments({
      isActive: true,
      validFrom: { $lte: now },
      validUntil: { $gte: now },
    }),
    Coupon.countDocuments({ validUntil: { $lt: now } }),
  ]);

  return {
    totalCoupons,
    activeCoupons,
    expiredCoupons,
    inactiveCoupons: totalCoupons - activeCoupons - expiredCoupons,
  };
}

function getCouponStatus(coupon: { isActive: boolean; validFrom: string; validUntil: string }) {
  const now = new Date();
  const validFrom = new Date(coupon.validFrom);
  const validUntil = new Date(coupon.validUntil);

  if (!coupon.isActive) return { label: "Inactive", color: "bg-muted text-muted-foreground" };
  if (now < validFrom) return { label: "Upcoming", color: "bg-accent/10 text-accent" };
  if (now > validUntil) return { label: "Expired", color: "bg-destructive/10 text-destructive" };
  return { label: "Active", color: "bg-stb-success/10 text-stb-success" };
}

export default async function CouponsPage({ searchParams }: CouponsPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const { coupons, total, page, totalPages, stats } = await getCoupons(params);
  const isSuperAdmin = session?.user?.role === "super_admin";

  const statCards = [
    { title: "Total Coupons", value: stats.totalCoupons, icon: Tag, color: "bg-primary" },
    { title: "Active", value: stats.activeCoupons, icon: CheckCircle, color: "bg-stb-success" },
    { title: "Expired", value: stats.expiredCoupons, icon: Clock, color: "bg-stb-warning" },
    { title: "Inactive", value: stats.inactiveCoupons, icon: XCircle, color: "bg-muted-foreground" },
  ];

  const statusFilters = [
    { value: "", label: "All" },
    { value: "active", label: "Active" },
    { value: "upcoming", label: "Upcoming" },
    { value: "expired", label: "Expired" },
    { value: "inactive", label: "Inactive" },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading-xl">Coupons</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Create and manage discount coupons
          </p>
        </div>
        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stb-primary-dark"
        >
          <Plus className="h-4 w-4" />
          Add Coupon
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border border-border bg-card p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statusFilters.map((filter) => (
          <Link
            key={filter.value}
            href={`/admin/coupons${filter.value ? `?status=${filter.value}` : ""}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              (params.status || "") === filter.value
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
            }`}
          >
            {filter.label}
          </Link>
        ))}
      </div>

      {/* Coupons Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Code
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Discount
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Usage
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Validity
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {coupons.length > 0 ? (
                coupons.map((coupon: {
                  _id: string;
                  code: string;
                  description?: string;
                  type: "percentage" | "fixed";
                  value: number;
                  minOrderValue: number;
                  maxDiscount?: number;
                  usageLimit?: number;
                  usageCount: number;
                  validFrom: string;
                  validUntil: string;
                  isActive: boolean;
                  createdBy?: { name: string };
                }) => {
                  const status = getCouponStatus(coupon);

                  return (
                    <tr key={coupon._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-mono font-semibold text-primary">{coupon.code}</p>
                          {coupon.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{coupon.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {coupon.type === "percentage" ? (
                            <>
                              <Percent className="h-4 w-4 text-stb-success" />
                              <span className="font-semibold">{coupon.value}%</span>
                            </>
                          ) : (
                            <>
                              <IndianRupee className="h-4 w-4 text-stb-success" />
                              <span className="font-semibold">{coupon.value.toLocaleString("en-IN")}</span>
                            </>
                          )}
                        </div>
                        {coupon.minOrderValue > 0 && (
                          <p className="text-xs text-muted-foreground">
                            Min: ₹{coupon.minOrderValue.toLocaleString("en-IN")}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">{coupon.usageCount}</span>
                        {coupon.usageLimit && (
                          <span className="text-muted-foreground">/{coupon.usageLimit}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(coupon.validFrom).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          {" - "}
                          {new Date(coupon.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className={status.color}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/coupons/${coupon._id}/edit`}
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          {isSuperAdmin && (
                            <DeleteCouponButton couponId={coupon._id} couponCode={coupon.code} />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No coupons found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="body-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} coupons
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/coupons?page=${page - 1}${params.status ? `&status=${params.status}` : ""}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/coupons?page=${page + 1}${params.status ? `&status=${params.status}` : ""}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
