import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Settings from "@/models/Settings";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET invoice data for an order
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const order = await Order.findById(id)
      .populate("user", "name email phone gstNumber businessName")
      .lean() as any;

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // Check if user owns this order or is admin
    const isAdmin = session.user.role === "admin" || session.user.role === "super_admin";
    const isOwner = order.user?._id?.toString() === session.user.id;

    if (!isAdmin && !isOwner) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get store settings
    const settings = await Settings.findOne().lean() as {
      storeName?: string;
      storeEmail?: string;
      storePhone?: string;
      storeAddress?: string;
      businessGstin?: string;
    } | null;

    const invoiceData = {
      // Invoice details
      invoiceNumber: `INV-${order.orderNumber}`,
      invoiceDate: order.createdAt,
      dueDate: order.createdAt, // Paid on order

      // Seller details
      seller: {
        name: settings?.storeName || "Sabka Tech Bazar",
        email: settings?.storeEmail || "sales@sabkatechbazar.com",
        phone: settings?.storePhone || "+91 6363677588",
        address: settings?.storeAddress || "2nd Floor, No. 94/1, Behind Sharda Theater, SP Road, Bangalore - 560002",
        gstin: settings?.businessGstin || "29AABCU9603R1ZM",
        state: "Karnataka",
        stateCode: "29",
      },

      // Buyer details
      buyer: {
        name: order.shippingAddress?.name || order.user?.name || "Customer",
        email: order.user?.email,
        phone: order.shippingAddress?.phone,
        address: order.shippingAddress
          ? `${order.shippingAddress.address}, ${order.shippingAddress.city}, ${order.shippingAddress.state} - ${order.shippingAddress.pincode}`
          : "",
        gstin: order.taxBreakdown?.customerGstin || order.user?.gstNumber || null,
        businessName: order.user?.businessName || null,
        state: order.shippingAddress?.state || "",
        stateCode: order.taxBreakdown?.customerStateCode || "",
      },

      // Order details
      orderNumber: order.orderNumber,
      orderDate: order.createdAt,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,

      // Items
      items: order.items.map((item: {
        name: string;
        sku: string;
        price: number;
        quantity: number;
        total: number;
      }) => ({
        name: item.name,
        sku: item.sku,
        price: item.price,
        quantity: item.quantity,
        total: item.total,
        // Calculate per-item tax (proportional)
        taxableValue: item.total,
      })),

      // Totals
      subtotal: order.subtotal,
      shippingCost: order.shippingCost,
      discount: order.discount || 0,

      // Tax breakdown
      taxBreakdown: order.taxBreakdown || {
        taxType: "INTER",
        cgst: 0,
        sgst: 0,
        igst: order.tax || 0,
        totalTax: order.tax || 0,
      },

      total: order.total,

      // Additional info
      notes: order.notes,
      terms: [
        "Goods once sold will not be taken back.",
        "Subject to Bangalore jurisdiction only.",
        "E&OE - Errors and Omissions Excepted.",
      ],
    };

    return NextResponse.json({ invoice: invoiceData });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
