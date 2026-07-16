import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT update address
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, address, city, state, pincode } = await request.json();

    if (!name || !phone || !address || !city || !state || !pincode) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    await dbConnect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await User.findById(session.user.id) as any;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const addr = user.addresses.id(id);
    if (!addr) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    addr.name = name.trim();
    addr.phone = phone.trim();
    addr.address = address.trim();
    addr.city = city.trim();
    addr.state = state.trim();
    addr.pincode = pincode.trim();

    await user.save();

    return NextResponse.json({ message: "Address updated successfully", addresses: user.addresses });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json({ error: "Failed to update address" }, { status: 500 });
  }
}

// DELETE remove address
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const user = await User.findById(session.user.id) as any;
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const addr = user.addresses.id(id);
    if (!addr) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    const wasDefault = addr.isDefault;
    addr.deleteOne();

    // If deleted address was default, set the first remaining as default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }

    await user.save();

    return NextResponse.json({ message: "Address deleted successfully", addresses: user.addresses });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json({ error: "Failed to delete address" }, { status: 500 });
  }
}
