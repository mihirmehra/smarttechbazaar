import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import { logAdminAction } from "@/lib/activity-logger";

// GET all orders (admin)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = Number(searchParams.get("page")) || 1;
    const limit = Number(searchParams.get("limit")) || 20;
    const skip = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const paymentStatus = searchParams.get("paymentStatus") || "";
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: "i" } },
        { "shippingAddress.name": { $regex: search, $options: "i" } },
        { "shippingAddress.phone": { $regex: search, $options: "i" } },
      ];
    }

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) {
        (query.createdAt as Record<string, Date>).$gte = new Date(dateFrom);
      }
      if (dateTo) {
        (query.createdAt as Record<string, Date>).$lte = new Date(dateTo);
      }
    }

    const [orders, total, stats] = await Promise.all([
      Order.find(query)
        .select("_id orderNumber total status paymentStatus createdAt shippingAddress items user trackingNumber")
        .populate("user", "name email phone")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(query),
      getOrderStats(),
    ]);

    return NextResponse.json({
      orders: JSON.parse(JSON.stringify(orders)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
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

// POST - Bulk action on orders
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { action, orderIds, data } = await request.json();

    if (!action || !orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }

    await dbConnect();

    let updateData: Record<string, unknown> = {};

    switch (action) {
      case "updateStatus":
        if (!data?.status) {
          return NextResponse.json({ error: "Status required" }, { status: 400 });
        }
        updateData = { status: data.status };
        if (data.status === "delivered") {
          updateData.deliveredAt = new Date();
        } else if (data.status === "cancelled") {
          updateData.cancelledAt = new Date();
          updateData.cancellationReason = data.reason || "Bulk cancelled by admin";
        }
        break;

      case "updatePaymentStatus":
        if (!data?.paymentStatus) {
          return NextResponse.json({ error: "Payment status required" }, { status: 400 });
        }
        updateData = { paymentStatus: data.paymentStatus };
        break;

      case "addTracking":
        if (!data?.trackingNumber) {
          return NextResponse.json({ error: "Tracking number required" }, { status: 400 });
        }
        updateData = {
          trackingNumber: data.trackingNumber,
          trackingUrl: data.trackingUrl || "",
          status: "shipped",
        };
        break;

      default:
        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const result = await Order.updateMany(
      { _id: { $in: orderIds } },
      { $set: { ...updateData, updatedAt: new Date() } }
    );

    // Log activity
    await logAdminAction(
      session.user.id,
      session.user.name || "Admin",
      session.user.role as "admin" | "super_admin",
      "other",
      `Bulk ${action} on ${result.modifiedCount} orders`,
      "order",
      undefined,
      { action, orderCount: result.modifiedCount, data }
    );

    return NextResponse.json({
      message: `Updated ${result.modifiedCount} orders`,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Error processing bulk action:", error);
    return NextResponse.json(
      { error: "Failed to process bulk action" },
      { status: 500 }
    );
  }
}
