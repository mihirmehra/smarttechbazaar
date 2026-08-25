import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Product from "@/models/Product";
import Order from "@/models/Order";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Ticket from "@/models/Ticket";

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const PAID = { paymentStatus: "paid" } as const;

function sumTotal(match: Record<string, unknown>) {
  return Order.aggregate([
    { $match: match },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session?.user?.role ||
      !["admin", "super_admin"].includes(session.user.role)
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    // Every query below is independent, so they all run in a single parallel
    // batch instead of sequential round trips.
    const [
      totalProducts,
      totalOrders,
      totalCustomers,
      totalCategories,
      totalBrands,
      openTickets,
      currentMonthRevenue,
      lastMonthRevenue,
      totalRevenue,
      monthlyRevenue,
      orderStatusBreakdown,
      topProducts,
      salesByCategory,
      recentOrders,
      lowStockProducts,
    ] = await Promise.all([
      Product.countDocuments({ isActive: true }),
      // Unfiltered count: metadata read instead of a collection scan.
      Order.estimatedDocumentCount(),
      User.countDocuments({ role: "user" }),
      Category.countDocuments({ isActive: true }),
      Brand.countDocuments({ isActive: true }),
      Ticket.countDocuments({ status: { $in: ["open", "in_progress"] } }),

      sumTotal({ ...PAID, createdAt: { $gte: startOfMonth } }),
      sumTotal({
        ...PAID,
        createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      }),
      sumTotal({ ...PAID }),

      // Monthly revenue trend (last 6 months)
      Order.aggregate([
        { $match: { ...PAID, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: {
              year: { $year: "$createdAt" },
              month: { $month: "$createdAt" },
            },
            revenue: { $sum: "$total" },
            orders: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]),

      // Order status breakdown
      Order.aggregate([{ $group: { _id: "$status", count: { $sum: 1 } } }]),

      // Top selling products. Grouping before the $lookup means we join a
      // handful of products instead of one per order line.
      Order.aggregate([
        { $match: { ...PAID } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            totalSold: { $sum: "$items.quantity" },
            revenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
        { $sort: { totalSold: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        {
          $unwind: { path: "$product", preserveNullAndEmptyArrays: true },
        },
        {
          $project: {
            name: { $ifNull: ["$product.name", "Deleted product"] },
            totalSold: 1,
            revenue: 1,
          },
        },
      ]),

      // Sales by category. Collapsing to distinct products first keeps the
      // product/category joins tiny.
      Order.aggregate([
        { $match: { ...PAID } },
        { $unwind: "$items" },
        {
          $group: {
            _id: "$items.product",
            revenue: {
              $sum: { $multiply: ["$items.price", "$items.quantity"] },
            },
          },
        },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product",
            pipeline: [{ $project: { category: 1 } }],
          },
        },
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.category",
            revenue: { $sum: "$revenue" },
          },
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category",
            pipeline: [{ $project: { name: 1 } }],
          },
        },
        { $unwind: { path: "$category", preserveNullAndEmptyArrays: true } },
        {
          $project: {
            name: { $ifNull: ["$category.name", "Uncategorized"] },
            revenue: 1,
          },
        },
      ]),

      // Recent orders: only the fields the dashboard table renders.
      Order.find()
        .sort({ createdAt: -1 })
        .limit(5)
        .select("orderNumber total status paymentStatus createdAt user")
        .populate("user", "name email")
        .lean(),

      // Low stock: most urgent first, minimal projection.
      Product.find({ stock: { $lt: 10 }, isActive: true })
        .sort({ stock: 1 })
        .limit(5)
        .select("name sku stock priceB2C images")
        .lean(),
    ]);

    const currentMonthRev = currentMonthRevenue[0]?.total || 0;
    const lastMonthRev = lastMonthRevenue[0]?.total || 0;

    // Guard against dividing by a zero baseline, which previously produced
    // absurd percentages by falling back to a denominator of 1.
    let revenueChange = 0;
    if (lastMonthRev > 0) {
      revenueChange = ((currentMonthRev - lastMonthRev) / lastMonthRev) * 100;
    } else if (currentMonthRev > 0) {
      revenueChange = 100;
    }

    const chartData = monthlyRevenue.map((item) => ({
      month: MONTH_NAMES[item._id.month - 1],
      revenue: item.revenue,
      orders: item.orders,
    }));

    const statusData = orderStatusBreakdown.map((item) => ({
      status: item._id,
      count: item.count,
    }));

    return NextResponse.json({
      stats: {
        totalRevenue: totalRevenue[0]?.total || 0,
        currentMonthRevenue: currentMonthRev,
        revenueChange: revenueChange.toFixed(1),
        totalOrders,
        totalProducts,
        totalCustomers,
        totalCategories,
        totalBrands,
        openTickets,
      },
      charts: {
        monthlyRevenue: chartData,
        orderStatus: statusData,
        topProducts,
        salesByCategory,
      },
      recentOrders,
      lowStockProducts,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
