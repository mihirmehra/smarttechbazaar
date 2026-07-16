import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import { sanitizeString } from "@/lib/validation";

// Define a model for failed payments (we'll log them for tracking)
import mongoose from "mongoose";

const FailedPaymentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  razorpayOrderId: {
    type: String,
    required: true,
  },
  errorCode: String,
  errorDescription: String,
  errorSource: String,
  errorStep: String,
  errorReason: String,
  metadata: {
    orderId: String,
    paymentId: String,
  },
  attemptCount: {
    type: Number,
    default: 1,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Use existing model or create new one
const FailedPayment = mongoose.models.FailedPayment || 
  mongoose.model("FailedPayment", FailedPaymentSchema);

interface PaymentFailedRequest {
  razorpay_order_id: string;
  error: {
    code?: string;
    description?: string;
    source?: string;
    step?: string;
    reason?: string;
    metadata?: {
      order_id?: string;
      payment_id?: string;
    };
  };
}

/**
 * POST endpoint to log failed payments
 * This helps track payment failures for analytics and customer support
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    // 2. Parse request body
    const body: PaymentFailedRequest = await request.json();
    const { razorpay_order_id, error } = body;

    // 3. Validate required fields
    if (!razorpay_order_id) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // 4. Connect to database
    await dbConnect();

    // 5. Check if there's an existing failure record for this order
    const existingFailure = await FailedPayment.findOne({
      razorpayOrderId: razorpay_order_id,
      user: session.user.id,
    });

    if (existingFailure) {
      // Update the existing record with new attempt
      existingFailure.attemptCount += 1;
      existingFailure.errorCode = error?.code || existingFailure.errorCode;
      existingFailure.errorDescription = sanitizeString(error?.description || "", 500);
      existingFailure.errorSource = error?.source || existingFailure.errorSource;
      existingFailure.errorStep = error?.step || existingFailure.errorStep;
      existingFailure.errorReason = error?.reason || existingFailure.errorReason;
      await existingFailure.save();

      console.log(`[Payment] Failure attempt ${existingFailure.attemptCount} for order ${razorpay_order_id}`, {
        userId: session.user.id,
        errorCode: error?.code,
        errorReason: error?.reason,
      });

      return NextResponse.json({
        success: true,
        message: "Payment failure logged",
        attemptCount: existingFailure.attemptCount,
        canRetry: existingFailure.attemptCount < 5, // Allow up to 5 attempts
      });
    }

    // 6. Create new failure record
    const failedPayment = new FailedPayment({
      user: session.user.id,
      razorpayOrderId: razorpay_order_id,
      errorCode: error?.code || "UNKNOWN",
      errorDescription: sanitizeString(error?.description || "Payment failed", 500),
      errorSource: error?.source || "unknown",
      errorStep: error?.step || "unknown",
      errorReason: error?.reason || "unknown",
      metadata: {
        orderId: error?.metadata?.order_id,
        paymentId: error?.metadata?.payment_id,
      },
    });

    await failedPayment.save();

    console.log(`[Payment] New failure logged for order ${razorpay_order_id}`, {
      userId: session.user.id,
      errorCode: error?.code,
      errorReason: error?.reason,
    });

    // 7. Return response with retry info
    return NextResponse.json({
      success: true,
      message: "Payment failure logged",
      attemptCount: 1,
      canRetry: true,
      // Provide helpful message based on error code
      userMessage: getErrorMessage(error?.code, error?.reason),
    });

  } catch (error) {
    console.error("[Payment] Error logging failure:", error);
    
    // Don't fail the request - just log internally
    return NextResponse.json({
      success: true,
      message: "Payment failure noted",
      canRetry: true,
    });
  }
}

/**
 * Get user-friendly error message based on Razorpay error code
 */
function getErrorMessage(code?: string, reason?: string): string {
  const messages: Record<string, string> = {
    // Bank/card related errors
    "BAD_REQUEST_ERROR": "There was an issue with the payment request. Please try again.",
    "GATEWAY_ERROR": "Bank gateway is temporarily unavailable. Please try again in a few minutes.",
    "NETWORK_ERROR": "Network connection issue. Please check your internet and try again.",
    "BAD_REQUEST_USER_CANCELLED": "Payment was cancelled. You can retry when ready.",
    
    // Card specific
    "CARD_DECLINED": "Your card was declined. Please try a different payment method.",
    "INSUFFICIENT_FUNDS": "Insufficient funds. Please use a different card or payment method.",
    "CARD_EXPIRED": "Your card has expired. Please use a different card.",
    "INVALID_CVV": "Invalid CVV entered. Please check and try again.",
    "CARD_BLOCKED": "Your card is blocked. Please contact your bank or use a different card.",
    
    // UPI specific
    "UPI_TIMEOUT": "UPI request timed out. Please try again.",
    "UPI_INVALID_PIN": "Invalid UPI PIN. Please try again with the correct PIN.",
    "UPI_DECLINED": "UPI transaction was declined. Please try again or use a different payment method.",
    
    // Bank specific
    "BANK_DECLINED": "Transaction was declined by your bank. Please contact your bank or try another method.",
    "BANK_UNAVAILABLE": "Your bank is temporarily unavailable. Please try again later.",
    
    // Generic
    "SERVER_ERROR": "Something went wrong. Please try again.",
    "TIMEOUT": "The payment request timed out. Please try again.",
  };

  // Check for specific codes first
  if (code && messages[code]) {
    return messages[code];
  }

  // Check reason for common patterns
  if (reason) {
    const lowerReason = reason.toLowerCase();
    if (lowerReason.includes("cancel")) {
      return "Payment was cancelled. You can retry when ready.";
    }
    if (lowerReason.includes("timeout") || lowerReason.includes("timed out")) {
      return "The payment request timed out. Please try again.";
    }
    if (lowerReason.includes("declined") || lowerReason.includes("reject")) {
      return "Payment was declined. Please try a different payment method.";
    }
    if (lowerReason.includes("insufficient")) {
      return "Insufficient funds. Please use a different payment method.";
    }
  }

  // Default message
  return "Payment could not be completed. Please try again or use a different payment method.";
}

/**
 * GET endpoint to check failed payment status
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
    const orderId = searchParams.get("orderId");

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const failedPayment = await FailedPayment.findOne({
      razorpayOrderId: orderId,
      user: session.user.id,
    });

    if (!failedPayment) {
      return NextResponse.json({
        found: false,
        canRetry: true,
      });
    }

    return NextResponse.json({
      found: true,
      attemptCount: failedPayment.attemptCount,
      canRetry: failedPayment.attemptCount < 5,
      lastError: {
        code: failedPayment.errorCode,
        description: failedPayment.errorDescription,
      },
    });

  } catch (error) {
    console.error("[Payment] Error checking failure status:", error);
    
    return NextResponse.json({
      found: false,
      canRetry: true,
    });
  }
}
