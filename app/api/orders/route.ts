import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Product from "@/models/Product";
import Cart from "@/models/Cart";
import User from "@/models/User";
import { sendEmail, COMPANY_EMAIL } from "@/lib/email";
import { orderConfirmationTemplate, newOrderNotificationTemplate } from "@/lib/email-templates";
import {
  validateName,
  validatePhoneNumber,
  validateAddress,
  validatePincode,
  validateObjectId,
  sanitizeString,
} from "@/lib/validation";

// GET user's orders
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const orders = await Order.find({ user: session.user.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST create order
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      items,
      shippingAddress,
      billingAddress,
      paymentMethod,
      notes,
    } = await request.json();

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: "Cart is empty" },
        { status: 400 }
      );
    }

    if (!shippingAddress) {
      return NextResponse.json(
        { error: "Shipping address is required" },
        { status: 400 }
      );
    }

    // Validate payment method
    if (!paymentMethod || !["razorpay", "bank_transfer"].includes(paymentMethod)) {
      return NextResponse.json(
        { error: "Invalid payment method" },
        { status: 400 }
      );
    }

    // Validate shipping address fields
    const nameValidation = validateName(shippingAddress.name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const phoneValidation = validatePhoneNumber(shippingAddress.phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
    }

    const addressValidation = validateAddress(shippingAddress.address);
    if (!addressValidation.valid) {
      return NextResponse.json({ error: addressValidation.error }, { status: 400 });
    }

    const pincodeValidation = validatePincode(shippingAddress.pincode);
    if (!pincodeValidation.valid) {
      return NextResponse.json({ error: pincodeValidation.error }, { status: 400 });
    }

    // Validate items
    for (const item of items) {
      if (!validateObjectId(item.product)) {
        return NextResponse.json({ error: "Invalid product ID" }, { status: 400 });
      }
      if (!item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity) || item.quantity > 1000) {
        return NextResponse.json({ error: "Invalid quantity" }, { status: 400 });
      }
    }

    // Sanitize address inputs
    const sanitizedShippingAddress = {
      name: nameValidation.normalized,
      phone: phoneValidation.normalized,
      address: addressValidation.normalized,
      city: sanitizeString(shippingAddress.city, 100),
      state: sanitizeString(shippingAddress.state, 50),
      pincode: pincodeValidation.normalized,
    };

    await dbConnect();

    // Get user for B2B pricing check
    const user = await User.findById(session.user.id);
    const isB2B = user?.isGstVerified === true;

    // SECURITY: Fetch products and calculate prices server-side
    // Never trust client-provided prices
    const productIds = items.map((item: { product: string }) => item.product);
    const products = await Product.find({ _id: { $in: productIds } });

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 400 }
      );
    }

    // Build order items with SERVER-SIDE prices
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.product);
      
      if (!product) {
        return NextResponse.json(
          { error: `Product not found: ${item.product}` },
          { status: 400 }
        );
      }

      // Validate quantity
      if (!item.quantity || item.quantity < 1 || !Number.isInteger(item.quantity)) {
        return NextResponse.json(
          { error: `Invalid quantity for ${product.name}` },
          { status: 400 }
        );
      }

      // Check stock availability
      if (product.stock < item.quantity) {
        return NextResponse.json(
          { error: `Insufficient stock for ${product.name}` },
          { status: 400 }
        );
      }

      // Use SERVER-SIDE price based on user type (B2B vs B2C) - ensure valid numbers with MRP fallbacks
      // This must match the cart API pricing logic for consistency
      const rawMrp = Number(product.mrp) || 0;
      const rawPriceB2C = Number(product.priceB2C) || 0;
      const rawPriceB2B = Number(product.priceB2B) || 0;
      
      // Apply fallbacks: if price is 0, use MRP as fallback
      const priceB2C = rawPriceB2C > 0 ? rawPriceB2C : rawMrp;
      const priceB2B = rawPriceB2B > 0 ? rawPriceB2B : (rawPriceB2C > 0 ? rawPriceB2C : rawMrp);
      
      const price = isB2B ? priceB2B : priceB2C;
      const quantity = Number(item.quantity) || 1;
      const itemTotal = price * quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        sku: product.sku || "N/A",
        image: product.images?.[0] || "",
        price: price,
        quantity: quantity,
        total: itemTotal,
      });
    }

    // Calculate shipping server-side
    const shippingCost = subtotal >= 5000 ? 0 : 99;

    // Calculate total (for COD, we skip GST for simplicity or add it here)
    const total = subtotal + shippingCost;

    // Create order with SERVER-CALCULATED values
    const order = await Order.create({
      user: session.user.id,
      items: orderItems,
      shippingAddress: sanitizedShippingAddress,
      billingAddress: billingAddress || sanitizedShippingAddress,
      subtotal,
      shippingCost,
      tax: 0,
      discount: 0,
      total,
      paymentMethod,
      paymentStatus: "pending",
      status: "pending",
      notes,
    });

    // Update product stock and sold count
    for (const item of items) {
      await Product.findByIdAndUpdate(item.product, {
        $inc: { stock: -item.quantity, soldCount: item.quantity },
      });
    }

    // Clear user's cart
    await Cart.deleteOne({ user: session.user.id });

    // Send order confirmation email to customer
    const customer = await User.findById(session.user.id);
    if (customer) {
      const orderDate = new Date().toLocaleDateString("en-IN", { dateStyle: "full" });
      const shippingAddressStr = `${shippingAddress.fullName}\n${shippingAddress.address}\n${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postalCode}\n${shippingAddress.country}\nPhone: ${shippingAddress.phone}`;
      
      const confirmationEmail = orderConfirmationTemplate(
        customer.name,
        order.orderNumber,
        orderDate,
        orderItems.map((item: { name: string; quantity: number; price: number }) => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        subtotal,
        shippingCost,
        0, // tax
        total,
        shippingAddressStr
      );
      
      await sendEmail({
        to: customer.email,
        subject: `Order Confirmed - ${order.orderNumber}`,
        html: confirmationEmail,
      });

      // Send new order notification to admin
      const adminNotification = newOrderNotificationTemplate(
        order.orderNumber,
        customer.name,
        customer.email,
        total,
        orderItems.length,
        orderDate
      );
      
      await sendEmail({
        to: COMPANY_EMAIL,
        subject: `New Order Received - ${order.orderNumber}`,
        html: adminNotification,
      });
    }

    // If Razorpay, create order and return orderId
    if (paymentMethod === "razorpay") {
      // TODO: Initialize Razorpay payment
      // For now, just return the order
    }

    return NextResponse.json(
      { message: "Order placed successfully", order },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating order:", error);
    return NextResponse.json(
      { error: "Failed to create order" },
      { status: 500 }
    );
  }
}
