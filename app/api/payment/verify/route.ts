import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import User from "@/models/User";
import Cart from "@/models/Cart";
import Notification from "@/models/Notification";
import Razorpay from "razorpay";
import {
  validatePhoneNumber,
  validatePincode,
  validateName,
  validateAddress,
  validateQuantity,
  validateObjectId,
  sanitizeString,
} from "@/lib/validation";
import { sendEmail, COMPANY_EMAIL } from "@/lib/email";
import { paymentSuccessTemplate, newOrderNotificationTemplate } from "@/lib/email-templates";
import { sendOrderPlacedNotification } from "@/lib/push-notifications";

// Initialize Razorpay instance for fetching order details
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

interface PaymentVerificationRequest {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
  shippingAddress: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  billingAddress?: {
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  notes?: string;
}

/**
 * Verify Razorpay payment signature using HMAC SHA256
 * This is the critical security check to prevent payment fraud
 */
function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  
  if (!secret) {
    console.error("RAZORPAY_KEY_SECRET is not configured");
    return false;
  }

  // Create the expected signature
  const body = orderId + "|" + paymentId;
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex");

  // Constant-time comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

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
    const body: PaymentVerificationRequest = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      shippingAddress,
      billingAddress,
      items,
      notes,
    } = body;

    // 3. Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json(
        { error: "Missing payment verification data" },
        { status: 400 }
      );
    }

    if (!shippingAddress) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Order items are required" },
        { status: 400 }
      );
    }

    // 3.5. Validate and sanitize inputs
    const nameValidation = validateName(shippingAddress.name);
    const phoneValidation = validatePhoneNumber(shippingAddress.phone);
    const addressValidation = validateAddress(shippingAddress.address);
    const pincodeValidation = validatePincode(shippingAddress.pincode);

    if (!nameValidation.valid || !phoneValidation.valid || 
        !addressValidation.valid || !pincodeValidation.valid) {
      return NextResponse.json(
        { error: "Invalid address data" },
        { status: 400 }
      );
    }

    // Validate items
    for (const item of items) {
      if (!validateObjectId(item.productId)) {
        return NextResponse.json(
          { error: "Invalid product ID" },
          { status: 400 }
        );
      }
      const qtyValidation = validateQuantity(item.quantity);
      if (!qtyValidation.valid) {
        return NextResponse.json(
          { error: qtyValidation.error },
          { status: 400 }
        );
      }
    }

    // Create sanitized address object
    const sanitizedShippingAddress = {
      name: nameValidation.normalized,
      phone: phoneValidation.normalized,
      address: addressValidation.normalized,
      city: sanitizeString(shippingAddress.city, 100),
      state: sanitizeString(shippingAddress.state, 50),
      pincode: pincodeValidation.normalized,
    };

    // 4. CRITICAL: Verify payment signature
    const isValidSignature = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValidSignature) {
      console.error("Invalid payment signature detected", {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        userId: session.user.id,
      });
      
      return NextResponse.json(
        { error: "Payment verification failed. Invalid signature." },
        { status: 400 }
      );
    }

    // 5. Connect to database
    await dbConnect();

    // 6. Check if order already exists (prevent duplicate orders)
    const existingOrder = await Order.findOne({
      razorpayOrderId: razorpay_order_id,
    });

    if (existingOrder) {
      // Return existing order if payment was already processed
      return NextResponse.json({
        success: true,
        message: "Order already processed",
        orderId: existingOrder._id,
        orderNumber: existingOrder.orderNumber,
      });
    }

    // 7. Fetch Razorpay order to get stored notes (contains validated prices)
    const razorpayOrder = await razorpay.orders.fetch(razorpay_order_id);
    
    if (!razorpayOrder) {
      return NextResponse.json(
        { error: "Unable to verify order details" },
        { status: 400 }
      );
    }

    // 8. Verify the order belongs to this user
    const orderNotes = razorpayOrder.notes as Record<string, string>;
    if (orderNotes?.userId !== session.user.id) {
      console.error("User mismatch in payment verification", {
        orderUserId: orderNotes?.userId,
        sessionUserId: session.user.id,
      });
      
      return NextResponse.json(
        { error: "Order verification failed" },
        { status: 403 }
      );
    }

    // 9. Get user details
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Determine if user is B2B (GST verified) for correct pricing
    const isB2B = user.gstNumber && user.isGstVerified;

    // 10. Fetch and validate products (use server prices)
    const productIds = items.map(item => item.productId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = await Product.find({ _id: { $in: productIds } }) as any[];

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 400 }
      );
    }

    // 11. Build order items with server-side prices (B2B vs B2C)
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.productId);
      
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 400 }
        );
      }

      // Final stock check before creating order
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      // Use correct price based on user type (B2B gets wholesale pricing) with MRP fallbacks
      // This must match the cart API pricing logic for consistency
      const rawMrp = Number(product.mrp) || 0;
      const rawPriceB2C = Number(product.priceB2C) || 0;
      const rawPriceB2B = Number(product.priceB2B) || 0;
      
      // Apply fallbacks: if price is 0, use MRP as fallback
      const priceB2C = rawPriceB2C > 0 ? rawPriceB2C : rawMrp;
      const priceB2B = rawPriceB2B > 0 ? rawPriceB2B : (rawPriceB2C > 0 ? rawPriceB2C : rawMrp);
      
      const price = isB2B ? priceB2B : priceB2C;
      const itemTotal = price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku,
        image: product.images?.[0] || "",
        price: price,
        quantity: item.quantity,
        total: itemTotal,
      });
    }

    // 12. Extract tax details from Razorpay order notes
    const cgst = parseFloat(orderNotes?.cgst || "0");
    const sgst = parseFloat(orderNotes?.sgst || "0");
    const igst = parseFloat(orderNotes?.igst || "0");
    const totalTax = parseFloat(orderNotes?.totalTax || "0");
    const shippingCost = parseFloat(orderNotes?.shippingCost || "0");
    const discount = parseFloat(orderNotes?.discount || "0");
    // Ensure taxType is valid enum value (INTRA or INTER)
    const rawTaxType = orderNotes?.taxType || "";
    const taxType: "INTRA" | "INTER" = rawTaxType === "INTRA" ? "INTRA" : "INTER";
    const customerStateCode = orderNotes?.customerStateCode || "";

    // 13. Calculate total from Razorpay (source of truth)
    const total = Number(razorpayOrder.amount) / 100; // Convert from paise

    // 14. Create order in database
    const orderCreatedAt = new Date();
    // confirmed is one second after placed so each timeline step has a unique timestamp
    const orderConfirmedAt = new Date(orderCreatedAt.getTime() + 1000);
    const order = new Order({
      user: session.user.id,
      items: orderItems,
      shippingAddress: sanitizedShippingAddress,
      billingAddress: billingAddress || sanitizedShippingAddress,
      subtotal,
      shippingCost,
      tax: totalTax,
      discount,
      total,
      status: "confirmed",
      statusHistory: [
        { status: "pending",   timestamp: orderCreatedAt },
        { status: "confirmed", timestamp: orderConfirmedAt, note: "Payment verified" },
      ],
      paymentStatus: "paid",
      paymentMethod: "razorpay",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      notes,
      // GST-specific fields (will add to model)
      taxBreakdown: {
        taxType,
        cgst,
        sgst,
        igst,
        totalTax,
        customerStateCode,
        customerGstin: user.gstNumber || null,
        businessGstin: process.env.BUSINESS_GSTIN || null,
      },
    });

    await order.save();

    // 15. Update product stock (atomic decrement)
    for (const item of items) {
      await Product.findByIdAndUpdate(
        item.productId,
        { $inc: { stock: -item.quantity } },
        { new: true }
      );
    }

    // 16. Clear user's cart after successful order
    await Cart.findOneAndUpdate(
      { user: session.user.id },
      { $set: { items: [] } }
    );

    // 17. Send payment success email to customer
    try {
      const shippingAddressText = `${sanitizedShippingAddress.name}\n${sanitizedShippingAddress.phone}\n${sanitizedShippingAddress.address}\n${sanitizedShippingAddress.city}, ${sanitizedShippingAddress.state} - ${sanitizedShippingAddress.pincode}`;
      
      const estimatedDeliveryDate = new Date();
      estimatedDeliveryDate.setDate(estimatedDeliveryDate.getDate() + 5);
      const estimatedDeliveryStr = estimatedDeliveryDate.toLocaleDateString("en-IN", { 
        weekday: "long", 
        day: "numeric", 
        month: "long", 
        year: "numeric" 
      });

      const emailItems = orderItems.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
      }));

      const paymentEmailHtml = paymentSuccessTemplate(
        user.name,
        order.orderNumber,
        razorpay_payment_id,
        emailItems,
        subtotal,
        shippingCost,
        totalTax,
        total,
        shippingAddressText,
        estimatedDeliveryStr,
        order._id.toString()
      );

      await sendEmail({
        to: user.email,
        subject: `Payment Confirmed - Order ${order.orderNumber}`,
        html: paymentEmailHtml,
      });
    } catch (emailError) {
      console.error("Failed to send payment success email:", emailError);
      // Don't fail the order if email fails
    }

    // 18. Send new order notification to admin
    try {
      if (COMPANY_EMAIL) {
        const adminEmailHtml = newOrderNotificationTemplate(
          order.orderNumber,
          user.name,
          user.email,
          total,
          orderItems.length,
          new Date().toLocaleDateString("en-IN", { dateStyle: "full" })
        );

        await sendEmail({
          to: COMPANY_EMAIL,
          subject: `New Order Received - ${order.orderNumber} (₹${total.toLocaleString("en-IN")})`,
          html: adminEmailHtml,
        });
      }
    } catch (adminEmailError) {
      console.error("Failed to send admin notification email:", adminEmailError);
    }

    // 19. Create admin notification in database
    try {
      await Notification.create({
        type: "order",
        title: "New Order Received",
        message: `New order #${order.orderNumber} from ${user.name} for ₹${total.toLocaleString("en-IN")}`,
        link: `/admin/orders/${order._id}`,
        isAdmin: true,
      });
    } catch (notificationError) {
      console.error("Failed to create admin notification:", notificationError);
    }

    // 20. Send push notification to customer's mobile app
    try {
      await sendOrderPlacedNotification(
        session.user.id,
        order.orderNumber,
        order._id.toString(),
        total
      );
    } catch (pushError) {
      console.error("Failed to send push notification:", pushError);
      // Don't fail the order if push notification fails
    }

    // 21. Return success response
    return NextResponse.json({
      success: true,
      message: "Payment verified and order created successfully",
      orderId: order._id,
      orderNumber: order.orderNumber,
      total: order.total,
      paymentId: razorpay_payment_id,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Payment verification error:", errorMessage);
    
    return NextResponse.json(
      { error: `Payment verification failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check payment status
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

    const order = await Order.findOne({
      razorpayOrderId: orderId,
      user: session.user.id,
    });

    if (!order) {
      return NextResponse.json({
        found: false,
        paymentStatus: "pending",
      });
    }

    return NextResponse.json({
      found: true,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      total: order.total,
    });

  } catch (error) {
    console.error("Payment status check error:", error);
    
    return NextResponse.json(
      { error: "Failed to check payment status" },
      { status: 500 }
    );
  }
}
