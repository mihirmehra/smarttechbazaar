import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Coupon from "@/models/Coupon";
import Order from "@/models/Order";
import { sanitizeString } from "@/lib/validation";

// POST validate and apply coupon
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Please login to apply coupon" }, { status: 401 });
    }

    const { code, cartTotal, cartItems } = await request.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    // Sanitize coupon code - only allow alphanumeric characters
    const sanitizedCode = sanitizeString(code, 50)
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "");

    if (sanitizedCode.length < 3 || sanitizedCode.length > 20) {
      return NextResponse.json({ error: "Invalid coupon code format" }, { status: 400 });
    }

    if (!cartTotal || typeof cartTotal !== "number" || cartTotal <= 0 || cartTotal > 10000000) {
      return NextResponse.json({ error: "Invalid cart total" }, { status: 400 });
    }

    await dbConnect();

    const coupon = await Coupon.findOne({ code: sanitizedCode });

    if (!coupon) {
      return NextResponse.json({ error: "Invalid coupon code" }, { status: 404 });
    }

    const now = new Date();

    // Check if coupon is active
    if (!coupon.isActive) {
      return NextResponse.json({ error: "This coupon is no longer active" }, { status: 400 });
    }

    // Check validity period
    if (now < coupon.validFrom) {
      return NextResponse.json({
        error: `This coupon is not valid yet. It starts on ${coupon.validFrom.toLocaleDateString("en-IN")}`,
      }, { status: 400 });
    }

    if (now > coupon.validUntil) {
      return NextResponse.json({ error: "This coupon has expired" }, { status: 400 });
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
      return NextResponse.json({ error: "This coupon has reached its usage limit" }, { status: 400 });
    }

    // Check minimum order value
    if (cartTotal < coupon.minOrderValue) {
      return NextResponse.json({
        error: `Minimum order value of ₹${coupon.minOrderValue.toLocaleString("en-IN")} required`,
      }, { status: 400 });
    }

    // Check user usage limit
    if (coupon.userUsageLimit) {
      const userUsageCount = await Order.countDocuments({
        user: session.user.id,
        couponCode: coupon.code,
        paymentStatus: { $in: ["paid", "pending"] },
      });

      if (userUsageCount >= coupon.userUsageLimit) {
        return NextResponse.json({
          error: `You have already used this coupon ${coupon.userUsageLimit} time(s)`,
        }, { status: 400 });
      }
    }

    // Check applicable categories/products
    // This would require more detailed cart item info
    // For now, we'll skip this check if no specific products/categories are set

    // Calculate discount
    let discount = 0;
    if (coupon.type === "percentage") {
      discount = (cartTotal * coupon.value) / 100;
      // Apply max discount cap if set
      if (coupon.maxDiscount && discount > coupon.maxDiscount) {
        discount = coupon.maxDiscount;
      }
    } else {
      discount = coupon.value;
      // Don't exceed cart total
      if (discount > cartTotal) {
        discount = cartTotal;
      }
    }

    // Round to 2 decimal places
    discount = Math.round(discount * 100) / 100;

    return NextResponse.json({
      valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value,
        description: coupon.description,
      },
      discount,
      message: `Coupon applied! You save ₹${discount.toLocaleString("en-IN")}`,
    });
  } catch (error) {
    console.error("Error validating coupon:", error);
    return NextResponse.json(
      { error: "Failed to validate coupon" },
      { status: 500 }
    );
  }
}
