import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Order from "@/models/Order";
import {
  Users,
  ShoppingBag,
  IndianRupee,
  Eye,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import CustomerFilters from "@/components/admin/CustomerFilters";

// Force dynamic rendering for admin pages
export const dynamic = "force-dynamic";

interface CustomersPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

interface CustomerWithStats {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  orderCount: number;
  totalSpent: number;
}

async function getCustomers(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const page = Number(searchParams.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {
      role: "customer",
    };

    if (searchParams.search) {
      query.$or = [
        { name: { $regex: searchParams.search, $options: "i" } },
        { email: { $regex: searchParams.search, $options: "i" } },
        { phone: { $regex: searchParams.search, $options: "i" } },
      ];
    }

    if (searchParams.status === "active") {
      query.isActive = true;
    } else if (searchParams.status === "inactive") {
      query.isActive = false;
    }

    const [users, total, stats] = await Promise.all([
      User.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
      getCustomerStats(),
    ]);

    // Get order stats for each customer
    const customerIds = users.map((u) => u._id);
    const orderStats = await Order.aggregate([
      { $match: { user: { $in: customerIds } } },
      {
        $group: {
          _id: "$user",
          orderCount: { $sum: 1 },
          totalSpent: { $sum: "$total" },
        },
      },
    ]);

    const orderStatsMap = new Map(
      orderStats.map((stat) => [stat._id.toString(), stat])
    );

    const customersWithStats: CustomerWithStats[] = users.map((user) => {
      const userStats = orderStatsMap.get(user._id.toString()) || {
        orderCount: 0,
        totalSpent: 0,
      };
      return {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        isActive: user.isActive,
        createdAt: user.createdAt.toISOString(),
        lastLoginAt: user.lastLoginAt?.toISOString(),
        orderCount: userStats.orderCount,
        totalSpent: userStats.totalSpent,
      };
    });

    return {
      customers: customersWithStats,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  } catch (error) {
    console.error("Error fetching customers:", error);
    return {
      customers: [],
      total: 0,
      page: 1,
      totalPages: 1,
      stats: {
        totalCustomers: 0,
        activeCustomers: 0,
        newThisMonth: 0,
        totalRevenue: 0,
      },
    };
  }
}

async function getCustomerStats() {
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [totalCustomers, activeCustomers, newThisMonth, revenueResult] = await Promise.all([
    User.countDocuments({ role: "customer" }),
    User.countDocuments({ role: "customer", isActive: true }),
    User.countDocuments({ role: "customer", createdAt: { $gte: startOfMonth } }),
    Order.aggregate([
      { $match: { paymentStatus: "paid" } },
      { $group: { _id: null, total: { $sum: "$total" } } },
    ]),
  ]);

  return {
    totalCustomers,
    activeCustomers,
    newThisMonth,
    totalRevenue: revenueResult[0]?.total || 0,
  };
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const params = await searchParams;
  const { customers, total, page, totalPages, stats } = await getCustomers(params);

  const statCards = [
    {
      title: "Total Customers",
      value: stats.totalCustomers,
      icon: Users,
      color: "bg-primary",
    },
    {
      title: "Active",
      value: stats.activeCustomers,
      icon: TrendingUp,
      color: "bg-stb-success",
    },
    {
      title: "New This Month",
      value: stats.newThisMonth,
      icon: Calendar,
      color: "bg-accent",
    },
    {
      title: "Total Revenue",
      value: `₹${stats.totalRevenue.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "bg-chart-4",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="heading-xl">Customers</h1>
        <p className="body-md mt-1 text-muted-foreground">
          Manage your customer base ({total} customers)
        </p>
      </div>

      {/* Stats Cards */}
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
      <CustomerFilters
        search={params.search as string | undefined}
        status={params.status as string | undefined}
      />

      {/* Customers Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Customer
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Contact
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Orders
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Total Spent
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Joined
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Last Active
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <tr key={customer._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {customer.name}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Mail className="h-3.5 w-3.5" />
                          {customer.email}
                        </div>
                        {customer.phone && (
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Phone className="h-3.5 w-3.5" />
                            {customer.phone}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{customer.orderCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-stb-success">
                      ₹{customer.totalSpent.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
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
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(customer.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {customer.lastLoginAt
                        ? new Date(customer.lastLoginAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/customers/${customer._id}`}
                          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">
                    No customers found
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
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} customers
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/customers?page=${page - 1}${params.status ? `&status=${params.status}` : ""}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/customers?page=${page + 1}${params.status ? `&status=${params.status}` : ""}`}
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
