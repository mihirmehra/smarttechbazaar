import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ShippingRate from "@/models/ShippingRate";

// GET single shipping rate
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const rate = await ShippingRate.findById(id).lean();

    if (!rate) {
      return NextResponse.json({ error: "Shipping rate not found" }, { status: 404 });
    }

    return NextResponse.json({ rate });
  } catch (error) {
    console.error("Error fetching shipping rate:", error);
    return NextResponse.json(
      { error: "Failed to fetch shipping rate" },
      { status: 500 }
    );
  }
}

// PUT update shipping rate
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();

    await dbConnect();

    const rate = await ShippingRate.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true }
    );

    if (!rate) {
      return NextResponse.json({ error: "Shipping rate not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Shipping rate updated successfully", rate });
  } catch (error) {
    console.error("Error updating shipping rate:", error);
    return NextResponse.json(
      { error: "Failed to update shipping rate" },
      { status: 500 }
    );
  }
}

// DELETE shipping rate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    const rate = await ShippingRate.findByIdAndDelete(id);

    if (!rate) {
      return NextResponse.json({ error: "Shipping rate not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Shipping rate deleted successfully" });
  } catch (error) {
    console.error("Error deleting shipping rate:", error);
    return NextResponse.json(
      { error: "Failed to delete shipping rate" },
      { status: 500 }
    );
  }
}
