import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import Razorpay from "razorpay";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Product from "@/models/Product";
import {
  calculateGST,
  extractStateCodeFromGSTIN,
  BUSINESS_STATE_CODE,
  STATE_CODES,
  GSTBreakdown,
} from "@/lib/gst";
import {
  validatePhoneNumber,
  validatePincode,
  validateName,
  validateAddress,
  validateQuantity,
  validateObjectId,
  sanitizeString,
} from "@/lib/validation";

// Initialize Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

interface CartItem {
  productId: string;
  quantity: number;
}

interface ShippingAddress {
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

/**
 * Get state code from state name or shipping address
 */
function getStateCodeFromName(stateName: string): string {
  const normalizedState = stateName.toLowerCase().trim();
  
  for (const [code, name] of Object.entries(STATE_CODES)) {
    if (name.toLowerCase() === normalizedState) {
      return code;
    }
  }
  
  // Common variations
  const stateVariations: { [key: string]: string } = {
    "karnataka": "29",
    "bangalore": "29",
    "bengaluru": "29",
    "maharashtra": "27",
    "mumbai": "27",
    "delhi": "07",
    "new delhi": "07",
    "tamil nadu": "33",
    "chennai": "33",
    "telangana": "36",
    "hyderabad": "36",
    "kerala": "32",
    "gujarat": "24",
    "rajasthan": "08",
    "uttar pradesh": "09",
    "west bengal": "19",
    "kolkata": "19",
    "punjab": "03",
    "haryana": "06",
    "madhya pradesh": "23",
    "andhra pradesh": "37",
    "bihar": "10",
    "odisha": "21",
    "jharkhand": "20",
    "assam": "18",
    "goa": "30",
  };
  
  return stateVariations[normalizedState] || BUSINESS_STATE_CODE;
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

    // 2. Parse and validate request body
    const body = await request.json();
    const { items, shippingAddress, couponCode } = body as {
      items: CartItem[];
      shippingAddress: ShippingAddress;
      couponCode?: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart items are required" },
        { status: 400 }
      );
    }

    if (!shippingAddress || !shippingAddress.state) {
      return NextResponse.json(
        { error: "Shipping address with state is required" },
        { status: 400 }
      );
    }

    // Validate shipping address fields
    const nameValidation = validateName(shippingAddress.name);
    if (!nameValidation.valid) {
      return NextResponse.json(
        { error: nameValidation.error },
        { status: 400 }
      );
    }

    const phoneValidation = validatePhoneNumber(shippingAddress.phone);
    if (!phoneValidation.valid) {
      return NextResponse.json(
        { error: phoneValidation.error },
        { status: 400 }
      );
    }

    const addressValidation = validateAddress(shippingAddress.address);
    if (!addressValidation.valid) {
      return NextResponse.json(
        { error: addressValidation.error },
        { status: 400 }
      );
    }

    const pincodeValidation = validatePincode(shippingAddress.pincode);
    if (!pincodeValidation.valid) {
      return NextResponse.json(
        { error: pincodeValidation.error },
        { status: 400 }
      );
    }

    // Validate cart items
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

    // Sanitize inputs
    const sanitizedAddress = {
      name: nameValidation.normalized,
      phone: phoneValidation.normalized,
      address: addressValidation.normalized,
      city: sanitizeString(shippingAddress.city, 100),
      state: sanitizeString(shippingAddress.state, 50),
      pincode: pincodeValidation.normalized,
    };

    // 3. Connect to database
    await dbConnect();

    // 4. Get user details for GST
    const user = await User.findById(session.user.id).lean();
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // 5. Determine customer state code
    // Priority: User's GSTIN > Shipping address state
    let customerStateCode: string;
    
    if (user.gstNumber && user.isGstVerified) {
      const gstStateCode = extractStateCodeFromGSTIN(user.gstNumber);
      customerStateCode = gstStateCode || getStateCodeFromName(shippingAddress.state);
    } else {
      customerStateCode = getStateCodeFromName(shippingAddress.state);
    }

    // 6. Fetch and validate products from database (prevent price manipulation)
    const productIds = items.map(item => item.productId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const products = await Product.find({ _id: { $in: productIds } }).lean() as any[];

    if (products.length !== items.length) {
      return NextResponse.json(
        { error: "One or more products not found" },
        { status: 400 }
      );
    }

    // 7. Determine if user is B2B (GST verified) for correct pricing
    const isB2B = user.gstNumber && user.isGstVerified;

    // 8. Calculate subtotal using SERVER-SIDE prices (security critical)
    let subtotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.productId);
      
      if (!product) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
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

      // Use correct price based on user type (B2B gets wholesale pricing) - ensure valid numbers with MRP fallbacks
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

      validatedItems.push({
        productId: product._id.toString(),
        name: product.name,
        sku: product.sku,
        price: price,
        quantity: quantity,
        total: itemTotal,
      });
    }

    // 8. Calculate shipping cost (can be made configurable)
    const shippingCost = subtotal >= 5000 ? 0 : 99; // Free shipping above ₹5000

    // 9. Apply coupon discount if provided
    let discount = 0;
    // TODO: Implement coupon validation from database
    // if (couponCode) {
    //   const coupon = await Coupon.findOne({ code: couponCode, isActive: true });
    //   if (coupon) discount = calculateDiscount(subtotal, coupon);
    // }

    // 10. Calculate GST based on customer state
    const taxableAmount = subtotal + shippingCost - discount;
    const gstBreakdown: GSTBreakdown = calculateGST(taxableAmount, customerStateCode);

    // 11. Calculate final total
    const finalTotal = gstBreakdown.grandTotal;
    const amountInPaise = Math.round(finalTotal * 100);

    // 12. Create Razorpay order with secure notes
    const razorpayOrder = await razorpay.orders.create({
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}_${session.user.id.slice(-6)}`,
      notes: {
        userId: session.user.id,
        userEmail: session.user.email || "",
        customerGstin: user.gstNumber || "",
        businessName: user.businessName || "",
        subtotal: subtotal.toString(),
        shippingCost: shippingCost.toString(),
        discount: discount.toString(),
        taxType: gstBreakdown.taxType,
        cgst: gstBreakdown.cgst.toString(),
        sgst: gstBreakdown.sgst.toString(),
        igst: gstBreakdown.igst.toString(),
        totalTax: gstBreakdown.totalTax.toString(),
        customerStateCode: customerStateCode,
        shippingState: shippingAddress.state,
      },
    });

    // 13. Return order details to frontend
    return NextResponse.json({
      success: true,
      orderId: razorpayOrder.id,
      amount: amountInPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID,
      // Include breakdown for display
      breakdown: {
        items: validatedItems,
        subtotal,
        shippingCost,
        discount,
        taxBreakdown: {
          taxType: gstBreakdown.taxType,
          cgst: gstBreakdown.cgst,
          sgst: gstBreakdown.sgst,
          igst: gstBreakdown.igst,
          totalTax: gstBreakdown.totalTax,
          customerState: gstBreakdown.customerStateName,
          isIntraState: gstBreakdown.isIntraState,
          customerGstin: user.gstNumber || null,
        },
        total: finalTotal,
        isB2B: !!isB2B,
      },
      // Customer details for Razorpay prefill
      prefill: {
        name: shippingAddress.name,
        email: session.user.email,
        contact: shippingAddress.phone,
      },
    });
  } catch (error) {
    console.error("Payment order creation error:", error);
    
    // Don't expose internal errors to client
    return NextResponse.json(
      { error: "Failed to create payment order. Please try again." },
      { status: 500 }
    );
  }
}
