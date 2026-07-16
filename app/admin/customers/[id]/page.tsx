import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Order from "@/models/Order";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  MapPin,
  ShoppingBag,
  IndianRupee,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CustomerDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-stb-warning/10 text-stb-warning", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-primary/10 text-primary", icon: CheckCircle },
  processing: { label: "Processing", color: "bg-accent/10 text-accent", icon: Package },
  shipped: { label: "Shipped", color: "bg-chart-4/10 text-chart-4", icon: Truck },
  delivered: { label: "Delivered", color: "bg-stb-success/10 text-stb-success", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive", icon: XCircle },
  returned: { label: "Returned", color: "bg-muted text-muted-foreground", icon: Package },
};

async function getCustomerDetails(id: string) {
  try {
    await dbConnect();

    const [customer, orders, orderStats] = await Promise.all([
      User.findById(id).lean(),
      Order.find({ user: id })
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      Order.aggregate([
        { $match: { user: id } },
        {
          $group: {
            _id: null,
            totalOrders: { $sum: 1 },
            totalSpent: { $sum: "$total" },
            avgOrderValue: { $avg: "$total" },
          },
        },
      ]),
    ]);

    if (!customer || customer.role !== "customer") {
      return null;
    }

    return {
      customer: JSON.parse(JSON.stringify(customer)),
      orders: JSON.parse(JSON.stringify(orders)),
      stats: orderStats[0] || { totalOrders: 0, totalSpent: 0, avgOrderValue: 0 },
    };
  } catch (error) {
    console.error("Error fetching customer:", error);
    return null;
  }
}

export default async function CustomerDetailPage({ params }: CustomerDetailPageProps) {
  const { id } = await params;
  const data = await getCustomerDetails(id);

  if (!data) {
    notFound();
  }

  const { customer, orders, stats } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/customers"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="heading-xl">{customer.name}</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Customer since {new Date(customer.createdAt).toLocaleDateString("en-IN", {
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
        <Badge
          variant={customer.isActive ? "default" : "secondary"}
          className={
            customer.isActive
              ? "bg-stb-success/10 text-stb-success"
              : "bg-destructive/10 text-destructive"
          }
        >
          {customer.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Info */}
        <div className="space-y-6 lg:col-span-1">
          {/* Contact Info */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="heading-md mb-4">Contact Information</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email</p>
                  <p className="font-medium">{customer.email}</p>
                </div>
              </div>

              {customer.phone && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium">{customer.phone}</p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {customer.lastLoginAt && (
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Last Login</p>
                    <p className="font-medium">
                      {new Date(customer.lastLoginAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="heading-md mb-4">Order Statistics</h2>
            <div className="grid gap-4 grid-cols-2">
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <ShoppingBag className="mx-auto h-5 w-5 text-muted-foreground mb-1" />
                <p className="text-xl font-bold">{stats.totalOrders}</p>
                <p className="text-xs text-muted-foreground">Total Orders</p>
              </div>
              <div className="rounded-lg bg-muted/50 p-3 text-center">
                <IndianRupee className="mx-auto h-5 w-5 text-stb-success mb-1" />
                <p className="text-xl font-bold">₹{stats.totalSpent.toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">Total Spent</p>
              </div>
              <div className="col-span-2 rounded-lg bg-muted/50 p-3 text-center">
                <p className="text-xl font-bold">₹{Math.round(stats.avgOrderValue).toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">Avg. Order Value</p>
              </div>
            </div>
          </div>

          {/* Addresses */}
          {customer.addresses && customer.addresses.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="heading-md mb-4">Saved Addresses</h2>
              <div className="space-y-3">
                {customer.addresses.map((address: {
                  _id: string;
                  name: string;
                  phone: string;
                  address: string;
                  city: string;
                  state: string;
                  pincode: string;
                  isDefault: boolean;
                }) => (
                  <div
                    key={address._id}
                    className={`rounded-lg border p-3 ${
                      address.isDefault ? "border-primary bg-primary/5" : "border-border"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="text-sm">
                        <p className="font-medium">{address.name}</p>
                        <p className="text-muted-foreground">{address.phone}</p>
                        <p className="mt-1 text-muted-foreground">
                          {address.address}, {address.city}, {address.state} - {address.pincode}
                        </p>
                        {address.isDefault && (
                          <Badge variant="secondary" className="mt-2 text-xs">
                            Default
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border p-4">
              <h2 className="heading-md">Recent Orders</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b border-border bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Order
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                      Items
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orders.length > 0 ? (
                    orders.map((order: {
                      _id: string;
                      orderNumber: string;
                      items: { quantity: number }[];
                      total: number;
                      status: string;
                      createdAt: string;
                    }) => {
                      const config = statusConfig[order.status] || statusConfig.pending;
                      const StatusIcon = config.icon;

                      return (
                        <tr key={order._id} className="hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Link
                              href={`/admin/orders/${order._id}`}
                              className="font-medium text-primary hover:underline"
                            >
                              #{order.orderNumber}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {order.items.reduce((acc, item) => acc + item.quantity, 0)}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold">
                            ₹{order.total.toLocaleString("en-IN")}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="secondary" className={config.color}>
                              <StatusIcon className="mr-1 h-3 w-3" />
                              {config.label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm text-muted-foreground">
                            {new Date(order.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                        No orders yet
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            {orders.length > 0 && (
              <div className="border-t border-border p-4">
                <Link
                  href={`/admin/orders?customer=${id}`}
                  className="text-sm text-primary hover:underline"
                >
                  View all orders
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
