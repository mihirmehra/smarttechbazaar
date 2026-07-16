import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ShippingRate from "@/models/ShippingRate";

// GET all shipping rates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const state = searchParams.get("state");
    const isActive = searchParams.get("isActive");

    const query: Record<string, unknown> = {};
    if (state) {
      query.state = state;
    }
    if (isActive !== null) {
      query.isActive = isActive === "true";
    }

    const rates = await ShippingRate.find(query)
      .sort({ state: 1, city: 1, rate: 1 })
      .lean();

    return NextResponse.json({ rates });
  } catch (error) {
    console.error("Error fetching shipping rates:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping rates" },
      { status: 500 }
    );
  }
}

// POST create shipping rate
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    await dbConnect();

    const rate = await ShippingRate.create(data);

    return NextResponse.json(
      { message: "Shipping rate created successfully", rate },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating shipping rate:", error);
    return NextResponse.json(
      { error: "Failed to create shipping rate" },
      { status: 500 }
    );
  }
}
