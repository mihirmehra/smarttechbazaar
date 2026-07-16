import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Razorpay from "razorpay";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

/**
 * GET endpoint to check payment status
 * Useful for recovering from page refreshes or network issues during payment
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const razorpayOrderId = searchParams.get("orderId");

    if (!razorpayOrderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // First check if we already have an order in our database
    const existingOrder = await Order.findOne({
      razorpayOrderId: razorpayOrderId,
      user: session.user.id,
    });

    if (existingOrder) {
      return NextResponse.json({
        status: "completed",
        paymentStatus: existingOrder.paymentStatus,
        orderId: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        message: "Order has been processed",
      });
    }

    // If no order in our DB, check Razorpay for the order status
    try {
      const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);
      
      // Verify this order belongs to the current user
      const orderNotes = razorpayOrder.notes as Record<string, string>;
      if (orderNotes?.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      // Check order status from Razorpay
      // Razorpay order statuses: created, attempted, paid
      const razorpayStatus = razorpayOrder.status;
      
      // If order is paid, we might have missed the webhook - need to verify
      if (razorpayStatus === "paid") {
        // Fetch payments for this order
        const payments = await razorpay.orders.fetchPayments(razorpayOrderId);
        const capturedPayment = payments.items.find(
          (p: { status: string }) => p.status === "captured"
        );

        if (capturedPayment) {
          return NextResponse.json({
            status: "paid_unverified",
            message: "Payment was successful but order needs verification. Please contact support.",
            razorpayOrderId,
            paymentId: capturedPayment.id,
          });
        }
      }

      return NextResponse.json({
        status: razorpayStatus,
        amount: Number(razorpayOrder.amount) / 100,
        currency: razorpayOrder.currency,
        canRetry: razorpayStatus === "created" || razorpayStatus === "attempted",
        message: getStatusMessage(razorpayStatus),
      });

    } catch (razorpayError) {
      console.error("Error fetching Razorpay order:", razorpayError);
      
      return NextResponse.json({
        status: "unknown",
        canRetry: true,
        message: "Unable to check payment status. You can try again.",
      });
    }

  } catch (error) {
    console.error("Payment status check error:", error);
    
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}

/**
 * Get user-friendly status message
 */
function getStatusMessage(status: string): string {
  switch (status) {
    case "created":
      return "Payment not yet initiated. You can proceed to pay.";
    case "attempted":
      return "Payment was attempted but not completed. You can retry.";
    case "paid":
      return "Payment was successful.";
    default:
      return "Unknown payment status.";
  }
}

/**
 * POST endpoint to initiate payment recovery
 * Creates a new order if the old one expired
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { razorpayOrderId } = body;

    if (!razorpayOrderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if order is already completed
    const existingOrder = await Order.findOne({
      razorpayOrderId: razorpayOrderId,
      user: session.user.id,
    });

    if (existingOrder) {
      return NextResponse.json({
        status: "already_completed",
        orderId: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
        message: "This order has already been processed.",
      });
    }

    // Check Razorpay order status
    try {
      const razorpayOrder = await razorpay.orders.fetch(razorpayOrderId);
      
      // Verify ownership
      const orderNotes = razorpayOrder.notes as Record<string, string>;
      if (orderNotes?.userId !== session.user.id) {
        return NextResponse.json(
          { error: "Order not found" },
          { status: 404 }
        );
      }

      // Check if order can be used for retry
      if (razorpayOrder.status === "paid") {
        return NextResponse.json({
          status: "paid_unverified",
          message: "Payment appears successful. Please contact support if order not confirmed.",
        });
      }

      // Order is still valid for retry
      if (razorpayOrder.status === "created" || razorpayOrder.status === "attempted") {
        return NextResponse.json({
          status: "can_retry",
          orderId: razorpayOrderId,
          amount: Number(razorpayOrder.amount) / 100,
          keyId: process.env.RAZORPAY_KEY_ID,
          message: "You can retry the payment.",
        });
      }

      return NextResponse.json({
        status: "expired",
        message: "This payment session has expired. Please start a new checkout.",
      });

    } catch (razorpayError) {
      console.error("Error fetching Razorpay order:", razorpayError);
      
      return NextResponse.json({
        status: "error",
        message: "Unable to recover payment. Please start a new checkout.",
      });
    }

  } catch (error) {
    console.error("Payment recovery error:", error);
    
    return NextResponse.json(
      { error: "Failed to recover payment" },
      { status: 500 }
    );
  }
}
