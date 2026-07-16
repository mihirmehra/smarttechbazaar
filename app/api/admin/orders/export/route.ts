import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";

// GET export orders as CSV
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const format = searchParams.get("format") || "csv";

    const query: Record<string, unknown> = {};

    if (status) {
      query.status = status;
    }

    if (paymentStatus) {
      query.paymentStatus = paymentStatus;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        (query.createdAt as Record<string, Date>).$gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        (query.createdAt as Record<string, Date>).$lte = end;
      }
    }

    const orders = await Order.find(query)
      .populate("user", "name email phone")
      .sort({ createdAt: -1 })
      .lean();

    if (format === "json") {
      return NextResponse.json({
        orders: JSON.parse(JSON.stringify(orders)),
        total: orders.length,
        exportedAt: new Date().toISOString(),
      });
    }

    // Generate CSV
    const csvHeaders = [
      "Order Number",
      "Customer Name",
      "Customer Email",
      "Customer Phone",
      "Status",
      "Payment Status",
      "Payment Method",
      "Subtotal",
      "Shipping",
      "Tax",
      "Discount",
      "Total",
      "Items Count",
      "Shipping Address",
      "City",
      "State",
      "Pincode",
      "GSTIN",
      "Order Date",
      "Tracking Number",
    ];

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const csvRows = orders.map((order: any) => {
      const row = [
        order.orderNumber,
        order.shippingAddress.name,
        order.user?.email || "",
        order.shippingAddress.phone,
        order.status,
        order.paymentStatus,
        order.paymentMethod,
        order.subtotal,
        order.shippingCost,
        order.tax || 0,
        order.discount || 0,
        order.total,
        order.items.reduce((acc: number, item: { quantity: number }) => acc + item.quantity, 0),
        order.shippingAddress.address.replace(/,/g, ";"),
        order.shippingAddress.city,
        order.shippingAddress.state,
        order.shippingAddress.pincode,
        order.taxBreakdown?.customerGstin || "",
        new Date(order.createdAt).toLocaleString("en-IN"),
        order.trackingNumber || "",
      ];
      return row.map((cell) => {
        // Escape quotes and wrap in quotes if contains comma
        const str = String(cell);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(",");
    });

    const csv = [csvHeaders.join(","), ...csvRows].join("\n");

    const filename = `orders-export-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Error exporting orders:", error);
    return NextResponse.json(
      { error: "Failed to export orders" },
      { status: 500 }
    );
  }
}
