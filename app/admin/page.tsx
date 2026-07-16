import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Category from "@/models/Category";
import Ticket from "@/models/Ticket";
import {
  Package,
  ShoppingCart,
  Users,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  TicketCheck,
  AlertTriangle,
  Clock,
  Calendar,
  BarChart3,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

// Force dynamic rendering for admin dashboard
export const dynamic = "force-dynamic";

async function getDashboardStats() {
  try {
    await dbConnect();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      totalCategories,
      recentOrders,
      lowStockProducts,
      // Today's stats
      todayOrders,
      todayRevenue,
      // This month stats
      monthRevenue,
      lastMonthRevenue,
      // Pending items
      pendingOrders,
      openTickets,
      // Top selling products (this month)
      topProducts,
      // Revenue by payment method (also includes total revenue calculation)
      revenueByPaymentMethod,
      // Total revenue
      totalRevenueResult,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      Order.countDocuments(),
      User.countDocuments({ role: "customer" }),
      Category.countDocuments({ isActive: true }),
      Order.find()
        .select("orderNumber total status createdAt user") // Select only needed fields
        .sort({ createdAt: -1 })
        .limit(5)
        .populate("user", "name email")
        .lean(),
      Product.find({ stock: { $lt: 10 }, isActive: true })
        .select("_id name sku stock") // Select only needed fields
        .limit(5)
        .lean(),
      // Today's orders
      Order.countDocuments({ createdAt: { $gte: startOfToday } }),
      // Today's revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfToday }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      // This month revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      // Last month revenue
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }, paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
      // Pending orders
      Order.countDocuments({ status: "pending" }),
      // Open tickets
      Ticket.countDocuments({ status: { $in: ["open", "in_progress"] } }),
      // Top selling products this month
      Order.aggregate([
        { $match: { createdAt: { $gte: startOfMonth } } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            name: { $first: "$items.name" },
            totalSold: { $sum: "$items.quantity" },
            revenue: { $sum: "$items.total" },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
      ]),
      // Revenue by payment method
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        {
          $group: {
            _id: "$paymentMethod",
            total: { $sum: "$total" },
            count: { $sum: 1 },
          },
        },
      ]),
      // Total revenue - included in parallel Promise.all instead of separate query
      Order.aggregate([
        { $match: { paymentStatus: "paid" } },
        { $group: { _id: null, total: { $sum: "$total" } } },
      ]),
    ]);

    const totalRevenue = totalRevenueResult[0]?.total || 0;

    // Calculate month over month change
    const thisMonthRev = monthRevenue[0]?.total || 0;
    const lastMonthRev = lastMonthRevenue[0]?.total || 1;
    const revenueChange = ((thisMonthRev - lastMonthRev) / lastMonthRev) * 100;

    return {
      totalProducts,
      totalOrders,
      totalCustomers,
      totalCategories,
      totalRevenue,
      todayOrders,
      todayRevenue: todayRevenue[0]?.total || 0,
      monthRevenue: thisMonthRev,
      revenueChange: revenueChange.toFixed(1),
      pendingOrders,
      openTickets,
      recentOrders: JSON.parse(JSON.stringify(recentOrders)),
      lowStockProducts: JSON.parse(JSON.stringify(lowStockProducts)),
      topProducts: JSON.parse(JSON.stringify(topProducts)),
      revenueByPaymentMethod: JSON.parse(JSON.stringify(revenueByPaymentMethod)),
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalProducts: 0,
      totalOrders: 0,
      totalCustomers: 0,
      totalCategories: 0,
      totalRevenue: 0,
      todayOrders: 0,
      todayRevenue: 0,
      monthRevenue: 0,
      revenueChange: "0",
      pendingOrders: 0,
      openTickets: 0,
      recentOrders: [],
      lowStockProducts: [],
      topProducts: [],
      revenueByPaymentMethod: [],
    };
  }
}

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  const stats = await getDashboardStats();

  const statCards = [
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      change: `${Number(stats.revenueChange) >= 0 ? "+" : ""}${stats.revenueChange}%`,
      trend: Number(stats.revenueChange) >= 0 ? "up" : "down",
      icon: IndianRupee,
      color: "bg-stb-success",
    },
    {
      title: "Total Orders",
      value: stats.totalOrders.toString(),
      subtitle: `${stats.todayOrders} today`,
      icon: ShoppingCart,
      color: "bg-primary",
    },
    {
      title: "Total Products",
      value: stats.totalProducts.toString(),
      subtitle: `${stats.lowStockProducts.length} low stock`,
      icon: Package,
      color: "bg-accent",
    },
    {
      title: "Total Customers",
      value: stats.totalCustomers.toString(),
      icon: Users,
      color: "bg-chart-4",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Welcome */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="heading-xl">
            Welcome back, {session?.user?.name?.split(" ")[0]}
          </h1>
          <p className="body-md mt-1 text-muted-foreground">
            {"Here's what's happening with your store today."}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {new Date().toLocaleDateString("en-IN", { 
            weekday: "long",
            year: "numeric",
            month: "long", 
            day: "numeric" 
          })}
        </div>
      </div>

      {/* Alerts */}
      {(stats.pendingOrders > 0 || stats.openTickets > 0 || stats.lowStockProducts.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-3">
          {stats.pendingOrders > 0 && (
            <Link
              href="/admin/orders?status=pending"
              className="flex items-center gap-3 rounded-xl border border-stb-warning/30 bg-stb-warning/10 p-4 transition-colors hover:bg-stb-warning/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-stb-warning">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{stats.pendingOrders} Pending Orders</p>
                <p className="text-xs text-muted-foreground">Require attention</p>
              </div>
            </Link>
          )}
          {stats.openTickets > 0 && (
            <Link
              href="/admin/tickets?status=open"
              className="flex items-center gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4 transition-colors hover:bg-accent/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent">
                <TicketCheck className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{stats.openTickets} Open Tickets</p>
                <p className="text-xs text-muted-foreground">Awaiting response</p>
              </div>
            </Link>
          )}
          {stats.lowStockProducts.length > 0 && (
            <Link
              href="/admin/inventory"
              className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 transition-colors hover:bg-destructive/20"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{stats.lowStockProducts.length} Low Stock Items</p>
                <p className="text-xs text-muted-foreground">Need restocking</p>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className="rounded-xl border border-border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.color}`}
              >
                <stat.icon className="h-6 w-6 text-white" />
              </div>
              {stat.trend && (
                <span
                  className={`flex items-center gap-1 text-sm font-medium ${
                    stat.trend === "up" ? "text-stb-success" : "text-destructive"
                  }`}
                >
                  {stat.trend === "up" ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {stat.change}
                </span>
              )}
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="body-sm text-muted-foreground">{stat.title}</p>
              {stat.subtitle && (
                <p className="text-xs text-muted-foreground mt-0.5">{stat.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Today's Summary */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Today&apos;s Summary</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-3xl font-bold text-foreground">{stats.todayOrders}</p>
            <p className="text-sm text-muted-foreground">Orders Received</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-3xl font-bold text-stb-success">
              ₹{stats.todayRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-muted-foreground">Revenue Today</p>
          </div>
          <div className="rounded-lg bg-muted/50 p-4 text-center">
            <p className="text-3xl font-bold text-primary">
              ₹{stats.monthRevenue.toLocaleString("en-IN")}
            </p>
            <p className="text-sm text-muted-foreground">Revenue This Month</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Orders */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="heading-md">Recent Orders</h2>
            <Link
              href="/admin/orders"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View All
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.recentOrders.length > 0 ? (
              stats.recentOrders.map((order: {
                _id: string;
                orderNumber: string;
                user?: { name: string; email: string };
                total: number;
                status: string;
                createdAt: string;
              }) => (
                <Link
                  key={order._id}
                  href={`/admin/orders/${order._id}`}
                  className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      #{order.orderNumber}
                    </p>
                    <p className="body-sm text-muted-foreground">
                      {order.user?.name || "Guest"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-foreground">
                      ₹{order.total.toLocaleString("en-IN")}
                    </p>
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                        order.status === "delivered"
                          ? "bg-stb-success/10 text-stb-success"
                          : order.status === "cancelled"
                            ? "bg-destructive/10 text-destructive"
                            : order.status === "pending"
                              ? "bg-stb-warning/10 text-stb-warning"
                              : "bg-accent/10 text-accent"
                      }`}
                    >
                      {order.status}
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No orders yet
              </div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="heading-md">Top Selling Products</h2>
            <Badge variant="secondary">This Month</Badge>
          </div>
          <div className="divide-y divide-border">
            {stats.topProducts.length > 0 ? (
              stats.topProducts.map((product: {
                _id: string;
                name: string;
                totalSold: number;
                revenue: number;
              }, index: number) => (
                <div
                  key={product._id}
                  className="flex items-center gap-4 px-6 py-4"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {index + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {product.totalSold} units sold
                    </p>
                  </div>
                  <span className="font-semibold text-stb-success shrink-0">
                    ₹{product.revenue.toLocaleString("en-IN")}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground">
                No sales data yet
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Low Stock Alert */}
        <div className="rounded-xl border border-border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="heading-md">Low Stock Alert</h2>
            <Link
              href="/admin/inventory"
              className="flex items-center gap-1 text-sm text-primary hover:underline"
            >
              View All
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {stats.lowStockProducts.length > 0 ? (
              stats.lowStockProducts.map((product: {
                _id: string;
                name: string;
                sku: string;
                stock: number;
              }) => (
                <div
                  key={product._id}
                  className="flex items-center justify-between px-6 py-4"
                >
                  <div>
                    <p className="font-medium text-foreground line-clamp-1">
                      {product.name}
                    </p>
                    <p className="body-sm text-muted-foreground">
                      SKU: {product.sku}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      product.stock === 0
                        ? "bg-destructive/10 text-destructive"
                        : "bg-stb-warning/10 text-stb-warning"
                    }`}
                  >
                    {product.stock === 0 ? "Out of Stock" : `${product.stock} left`}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-6 py-8 text-center text-muted-foreground">
                All products are well stocked
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods Distribution */}
        <div className="rounded-xl border border-border bg-card shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="heading-md">Revenue by Payment Method</h2>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="p-6">
            {stats.revenueByPaymentMethod.length > 0 ? (
              <div className="space-y-4">
                {stats.revenueByPaymentMethod.map((method: {
                  _id: string;
                  total: number;
                  count: number;
                }) => {
                  const totalRevenue = stats.revenueByPaymentMethod.reduce(
                    (acc: number, m: { total: number }) => acc + m.total,
                    0
                  );
                  const percentage = totalRevenue > 0 
                    ? ((method.total / totalRevenue) * 100).toFixed(1) 
                    : "0";
                  const colors: Record<string, string> = {
                    razorpay: "bg-primary",
                    cod: "bg-stb-warning",
                    bank_transfer: "bg-accent",
                  };
                  return (
                    <div key={method._id} className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">
                          {method._id === "cod" ? "Cash on Delivery (Legacy)" : method._id.replace("_", " ")}
                        </span>
                        <span className="text-muted-foreground">
                          {method.count} orders ({percentage}%)
                        </span>
                      </div>
                      <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className={`h-full rounded-full transition-all ${colors[method._id] || "bg-chart-4"}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <p className="text-right text-sm font-semibold text-stb-success">
                        ₹{method.total.toLocaleString("en-IN")}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                No payment data available
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
        <h2 className="heading-md mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin/products/new"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-stb-primary-dark"
          >
            Add Product
          </Link>
          <Link
            href="/admin/categories/new"
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            Add Category
          </Link>
          <Link
            href="/admin/orders"
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            View Orders
          </Link>
          <Link
            href="/admin/banners"
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            Manage Banners
          </Link>
          <Link
            href="/admin/reports"
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            View Reports
          </Link>
          <Link
            href="/admin/coupons/new"
            className="rounded-lg bg-muted px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/80"
          >
            Create Coupon
          </Link>
        </div>
      </div>
    </div>
  );
}
