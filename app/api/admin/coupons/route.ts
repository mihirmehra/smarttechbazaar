import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Coupon from "@/models/Coupon";

// GET all coupons
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    if (status === "active") {
      const now = new Date();
      query.isActive = true;
      query.validFrom = { $lte: now };
      query.validUntil = { $gte: now };
    } else if (status === "inactive") {
      query.isActive = false;
    } else if (status === "expired") {
      query.validUntil = { $lt: new Date() };
    } else if (status === "upcoming") {
      query.validFrom = { $gt: new Date() };
    }

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("createdBy", "name")
        .lean(),
      Coupon.countDocuments(query),
    ]);

    // Get stats
    const now = new Date();
    const [totalCoupons, activeCoupons, expiredCoupons] = await Promise.all([
      Coupon.countDocuments(),
      Coupon.countDocuments({
        isActive: true,
        validFrom: { $lte: now },
        validUntil: { $gte: now },
      }),
      Coupon.countDocuments({ validUntil: { $lt: now } }),
    ]);

    return NextResponse.json({
      coupons: JSON.parse(JSON.stringify(coupons)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        inactiveCoupons: totalCoupons - activeCoupons - expiredCoupons,
      },
    });
  } catch (error) {
    console.error("Error fetching coupons:", error);
    return NextResponse.json(
      { error: "Failed to fetch coupons" },
      { status: 500 }
    );
  }
}

// POST create new coupon
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    await dbConnect();

    // Check if code already exists
    const existingCoupon = await Coupon.findOne({ code: data.code.toUpperCase() });
    if (existingCoupon) {
      return NextResponse.json(
        { error: "Coupon code already exists" },
        { status: 400 }
      );
    }

    // Validate dates
    const validFrom = new Date(data.validFrom);
    const validUntil = new Date(data.validUntil);
    if (validUntil <= validFrom) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Validate percentage value
    if (data.type === "percentage" && (data.value < 0 || data.value > 100)) {
      return NextResponse.json(
        { error: "Percentage must be between 0 and 100" },
        { status: 400 }
      );
    }

    const coupon = await Coupon.create({
      ...data,
      code: data.code.toUpperCase(),
      createdBy: session.user.id,
    });

    return NextResponse.json({
      message: "Coupon created successfully",
      coupon: JSON.parse(JSON.stringify(coupon)),
    });
  } catch (error) {
    console.error("Error creating coupon:", error);
    return NextResponse.json(
      { error: "Failed to create coupon" },
      { status: 500 }
    );
  }
}
