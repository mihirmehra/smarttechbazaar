import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ShoppingCart,
  Users,
  Package,
  IndianRupee,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ReportsPageProps {
  searchParams: Promise<{ period?: string }>;
}

async function getReportData(period: string) {
  try {
    await dbConnect();

    const now = new Date();
    let startDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;

    switch (period) {
      case "week":
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        previousEndDate = startDate;
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1);
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31);
        break;
      case "month":
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
    }

    // Current period stats
    const [
      currentOrders,
      currentRevenue,
      currentCustomers,
      previousOrders,
      previousRevenue,
      previousCustomers,
      topProducts,
      ordersByStatus,
      revenueByDay,
      topCustomers,
      lowStockProducts,
      recentOrders,
    ] = await Promise.all([
      // Current period
      Order.countDocuments({ createdAt: { $gte: startDate } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      User.countDocuments({ role: "customer", createdAt: { $gte: startDate } }),

      // Previous period
      Order.countDocuments({
        createdAt: { $gte: previousStartDate, $lt: previousEndDate },
      }),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: previousStartDate, $lt: previousEndDate },
            paymentStatus: "paid",
          },
        },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      User.countDocuments({
        role: "customer",
        createdAt: { $gte: previousStartDate, $lt: previousEndDate },
      }),

      // Top selling products
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
            totalSold: { $sum: "$items.quantity" },
            totalRevenue: { $sum: "$items.total" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),

      // Orders by status
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: "$status", count: { $sum: 1 } } },
      ]),

      // Revenue by day (last 7 days)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) },
            paymentStatus: "paid",
          },
        },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top customers
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate }, paymentStatus: "paid" } },
        {
          $group: {
            _id: "$user",
            totalSpent: { $sum: "$total" },
            orderCount: { $sum: 1 },
          },
        },
        { $sort: { totalSpent: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "users",
            localField: "_id",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
        {
          $project: {
            name: "$user.name",
            email: "$user.email",
            totalSpent: 1,
            orderCount: 1,
          },
        },
      ]),

      // Low stock products
      Product.find({ stock: { $lt: 10 }, isActive: true })
        .select("name sku stock")
        .sort({ stock: 1 })
        .limit(5)
        .lean(),

      // Recent orders
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name")
        .lean(),
    ]);

    const currentRevenueValue = currentRevenue[0]?.total || 0;
    const previousRevenueValue = previousRevenue[0]?.total || 0;

    // Calculate percentage changes
    const revenueChange =
      previousRevenueValue > 0
        ? ((currentRevenueValue - previousRevenueValue) / previousRevenueValue) * 100
        : 0;
    const ordersChange =
      previousOrders > 0
        ? ((currentOrders - previousOrders) / previousOrders) * 100
        : 0;
    const customersChange =
      previousCustomers > 0
        ? ((currentCustomers - previousCustomers) / previousCustomers) * 100
        : 0;

    return {
      summary: {
        revenue: currentRevenueValue,
        revenueChange,
        orders: currentOrders,
        ordersChange,
        customers: currentCustomers,
        customersChange,
        avgOrderValue: currentOrders > 0 ? currentRevenueValue / currentOrders : 0,
      },
      topProducts: JSON.parse(JSON.stringify(topProducts)),
      ordersByStatus: ordersByStatus.reduce(
        (acc: Record<string, number>, item: { _id: string; count: number }) => {
          acc[item._id] = item.count;
          return acc;
        },
        {}
      ),
      revenueByDay: JSON.parse(JSON.stringify(revenueByDay)),
      topCustomers: JSON.parse(JSON.stringify(topCustomers)),
      lowStockProducts: JSON.parse(JSON.stringify(lowStockProducts)),
      recentOrders: JSON.parse(JSON.stringify(recentOrders)),
    };
  } catch (error) {
    console.error("Error fetching report data:", error);
    return {
      summary: {
        revenue: 0,
        revenueChange: 0,
        orders: 0,
        ordersChange: 0,
        customers: 0,
        customersChange: 0,
        avgOrderValue: 0,
      },
      topProducts: [],
      ordersByStatus: {},
      revenueByDay: [],
      topCustomers: [],
      lowStockProducts: [],
      recentOrders: [],
    };
  }
}

const statusColors: Record<string, string> = {
  pending: "bg-stb-warning",
  confirmed: "bg-primary",
  processing: "bg-accent",
  shipped: "bg-chart-4",
  delivered: "bg-stb-success",
  cancelled: "bg-destructive",
  returned: "bg-muted-foreground",
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const params = await searchParams;
  const period = params.period || "month";
  const data = await getReportData(period);

  const periodLabels: Record<string, string> = {
    week: "This Week",
    month: "This Month",
    year: "This Year",
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading-xl">Reports &amp; Analytics</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Business insights and performance metrics
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(["week", "month", "year"] as const).map((p) => (
            <a
              key={p}
              href={`/admin/reports?period=${p}`}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                period === p
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </a>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Revenue"
          value={`₹${data.summary.revenue.toLocaleString("en-IN")}`}
          change={data.summary.revenueChange}
          icon={IndianRupee}
          color="bg-stb-success"
        />
        <SummaryCard
          title="Orders"
          value={data.summary.orders.toString()}
          change={data.summary.ordersChange}
          icon={ShoppingCart}
          color="bg-primary"
        />
        <SummaryCard
          title="New Customers"
          value={data.summary.customers.toString()}
          change={data.summary.customersChange}
          icon={Users}
          color="bg-accent"
        />
        <SummaryCard
          title="Avg. Order Value"
          value={`₹${Math.round(data.summary.avgOrderValue).toLocaleString("en-IN")}`}
          icon={BarChart3}
          color="bg-chart-4"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="heading-md">Revenue (Last 7 Days)</h2>
            <Badge variant="secondary">{periodLabels[period]}</Badge>
          </div>

          {data.revenueByDay.length > 0 ? (
            <div className="space-y-3">
              {data.revenueByDay.map((day: { _id: string; revenue: number; orders: number }) => {
                const maxRevenue = Math.max(
                  ...data.revenueByDay.map((d: { revenue: number }) => d.revenue)
                );
                const percentage = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;

                return (
                  <div key={day._id} className="flex items-center gap-4">
                    <span className="w-20 shrink-0 text-sm text-muted-foreground">
                      {new Date(day._id).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                    <div className="flex-1">
                      <div className="h-6 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="w-24 shrink-0 text-right text-sm font-medium">
                      ₹{day.revenue.toLocaleString("en-IN")}
                    </span>
                    <span className="w-16 shrink-0 text-right text-xs text-muted-foreground">
                      {day.orders} orders
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              No revenue data for this period
            </div>
          )}
        </div>

        {/* Orders by Status */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <h2 className="heading-md mb-4">Orders by Status</h2>

          {Object.keys(data.ordersByStatus).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(data.ordersByStatus).map(([status, count]) => {
                const total = Object.values(data.ordersByStatus).reduce(
                  (a, b) => (a as number) + (b as number),
                  0
                ) as number;
                const percentage = total > 0 ? ((count as number) / total) * 100 : 0;

                return (
                  <div key={status} className="flex items-center gap-3">
                    <div className={`h-3 w-3 rounded-full ${statusColors[status] || "bg-muted"}`} />
                    <span className="flex-1 text-sm capitalize">{status}</span>
                    <span className="text-sm font-medium">{count as number}</span>
                    <span className="w-12 text-right text-xs text-muted-foreground">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              No orders in this period
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="heading-md">Top Selling Products</h2>
          </div>
          <div className="divide-y divide-border">
            {data.topProducts.length > 0 ? (
              data.topProducts.map(
                (product: { _id: string; name: string; totalSold: number; totalRevenue: number }, index: number) => (
                  <div key={product._id} className="flex items-center gap-4 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-medium">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {product.totalSold} units sold
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-stb-success">
                      ₹{product.totalRevenue.toLocaleString("en-IN")}
                    </span>
                  </div>
                )
              )
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No sales data for this period
              </div>
            )}
          </div>
        </div>

        {/* Top Customers */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="heading-md">Top Customers</h2>
          </div>
          <div className="divide-y divide-border">
            {data.topCustomers.length > 0 ? (
              data.topCustomers.map(
                (customer: { _id: string; name: string; email: string; totalSpent: number; orderCount: number }, index: number) => (
                  <div key={customer._id} className="flex items-center gap-4 p-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
                      {index + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{customer.name}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {customer.orderCount} orders
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold text-stb-success">
                      ₹{customer.totalSpent.toLocaleString("en-IN")}
                    </span>
                  </div>
                )
              )
            ) : (
              <div className="flex h-48 items-center justify-center text-muted-foreground">
                No customer data for this period
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Low Stock Alert */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="heading-md">Low Stock Alert</h2>
              {data.lowStockProducts.length > 0 && (
                <Badge variant="destructive">{data.lowStockProducts.length} items</Badge>
              )}
            </div>
          </div>
          <div className="divide-y divide-border">
            {data.lowStockProducts.length > 0 ? (
              data.lowStockProducts.map(
                (product: { _id: string; name: string; sku: string; stock: number }) => (
                  <div key={product._id} className="flex items-center gap-4 p-4">
                    <Package className="h-5 w-5 shrink-0 text-muted-foreground" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="font-mono text-sm text-muted-foreground">
                        {product.sku}
                      </p>
                    </div>
                    <Badge
                      variant="destructive"
                      className={
                        product.stock === 0
                          ? "bg-destructive"
                          : "bg-stb-warning/10 text-stb-warning"
                      }
                    >
                      {product.stock === 0 ? "Out of Stock" : `${product.stock} left`}
                    </Badge>
                  </div>
                )
              )
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                All products have adequate stock
              </div>
            )}
          </div>
        </div>

        {/* Recent Orders */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="border-b border-border p-4">
            <h2 className="heading-md">Recent Orders</h2>
          </div>
          <div className="divide-y divide-border">
            {data.recentOrders.length > 0 ? (
              data.recentOrders.map(
                (order: {
                  _id: string;
                  orderNumber: string;
                  user?: { name: string };
                  total: number;
                  status: string;
                  createdAt: string;
                }) => (
                  <a
                    key={order._id}
                    href={`/admin/orders/${order._id}`}
                    className="flex items-center gap-4 p-4 transition-colors hover:bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">#{order.orderNumber}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {order.user?.name || "Guest"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">
                        ₹{order.total.toLocaleString("en-IN")}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {order.status}
                      </p>
                    </div>
                  </a>
                )
              )
            ) : (
              <div className="flex h-32 items-center justify-center text-muted-foreground">
                No orders yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  change,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  change?: number;
  icon: typeof IndianRupee;
  color: string;
}) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="h-5 w-5 text-white" />
        </div>
        {change !== undefined && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              isPositive
                ? "bg-stb-success/10 text-stb-success"
                : "bg-destructive/10 text-destructive"
            }`}
          >
            {isPositive ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            {Math.abs(change).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
      </div>
    </div>
  );
}
