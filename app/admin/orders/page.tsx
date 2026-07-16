import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import {
  ShoppingCart,
  Clock,
  Truck,
  CheckCircle,
  XCircle,
  IndianRupee,
  Eye,
  Package,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import OrderFilters from "@/components/admin/OrderFilters";
import ExportOrdersButton from "@/components/admin/ExportOrdersButton";

// Force dynamic rendering for admin pages
export const dynamic = "force-dynamic";

interface OrdersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getOrders(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const page = Number(searchParams.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;
    const status = searchParams.status as string;
    const paymentStatus = searchParams.paymentStatus as string;

    const query: Record<string, unknown> = {};

    if (searchParams.search) {
      query.$or = [
        { orderNumber: { $regex: searchParams.search, $options: "i" } },
        { "shippingAddress.name": { $regex: searchParams.search, $options: "i" } },
        { "shippingAddress.phone": { $regex: searchParams.search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    const [orders, total, stats] = await Promise.all([
      Order.find(query)
        .populate("user", "name email")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
      getOrderStats(),
    ]);

    return {
      orders: JSON.parse(JSON.stringify(orders)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  } catch (error) {
    console.error("Error fetching orders:", error);
    return {
      orders: [],
      total: 0,
      page: 1,
      totalPages: 1,
      stats: {
        totalOrders: 0,
        pendingOrders: 0,
        processingOrders: 0,
        shippedOrders: 0,
        deliveredOrders: 0,
        cancelledOrders: 0,
        totalRevenue: 0,
        todayOrders: 0,
      },
    };
  }
}

async function getOrderStats() {
  const [
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue,
    todayOrders,
  ] = await Promise.all([
    Order.countDocuments(),
    Order.countDocuments({ status: "pending" }),
    Order.countDocuments({ status: { $in: ["confirmed", "processing"] } }),
    Order.countDocuments({ status: "shipped" }),
    Order.countDocuments({ status: "delivered" }),
    Order.countDocuments({ status: "cancelled" }),
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
    Order.countDocuments({
      createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }),
  ]);

  return {
    totalOrders,
    pendingOrders,
    processingOrders,
    shippedOrders,
    deliveredOrders,
    cancelledOrders,
    totalRevenue: totalRevenue[0]?.total || 0,
    todayOrders,
  };
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

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-stb-warning/10 text-stb-warning" },
  paid: { label: "Paid", color: "bg-stb-success/10 text-stb-success" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive" },
  refunded: { label: "Refunded", color: "bg-muted text-muted-foreground" },
};

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const { orders, total, page, totalPages, stats } = await getOrders(params);
  const isSuperAdmin = session?.user?.role === "super_admin";

  const statCards = [
    { title: "Total Orders", value: stats.totalOrders, icon: ShoppingCart, color: "bg-primary" },
    { title: "Today", value: stats.todayOrders, icon: Clock, color: "bg-accent" },
    { title: "Pending", value: stats.pendingOrders, icon: Clock, color: "bg-stb-warning" },
    { title: "Shipped", value: stats.shippedOrders, icon: Truck, color: "bg-chart-4" },
    { title: "Delivered", value: stats.deliveredOrders, icon: CheckCircle, color: "bg-stb-success" },
    { title: "Revenue", value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "bg-stb-success", wide: true },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading-xl">Orders</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Manage and track customer orders
          </p>
        </div>
        <ExportOrdersButton
          currentStatus={params.status as string | undefined}
          currentPaymentStatus={params.paymentStatus as string | undefined}
        />
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className={`rounded-xl border border-border bg-card p-4 shadow-sm ${stat.wide ? "sm:col-span-2 lg:col-span-1" : ""}`}
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
      <OrderFilters
        search={params.search as string | undefined}
        status={params.status as string | undefined}
        paymentStatus={params.paymentStatus as string | undefined}
      />

      {/* Orders Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Order
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Customer
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
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Payment
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Date
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length > 0 ? (
                orders.map((order: {
                  _id: string;
                  orderNumber: string;
                  user?: { name: string; email: string };
                  shippingAddress: { name: string; phone: string };
                  items: { quantity: number }[];
                  total: number;
                  status: string;
                  paymentStatus: string;
                  paymentMethod: string;
                  createdAt: string;
                }) => {
                  const config = statusConfig[order.status] || statusConfig.pending;
                  const paymentConfig = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.pending;
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
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-foreground">
                            {order.shippingAddress.name}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.user?.email || order.shippingAddress.phone}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">
                          {order.items.reduce((acc, item) => acc + item.quantity, 0)}
                        </span>
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
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className={paymentConfig.color}>
                          {paymentConfig.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/orders/${order._id}`}
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No orders found
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
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} orders
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/orders?page=${page - 1}${params.status ? `&status=${params.status}` : ""}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/orders?page=${page + 1}${params.status ? `&status=${params.status}` : ""}`}
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
