import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PUT set address as primary
export async function PUT(request: NextRequest, { params }: RouteParams) {
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

    const targetAddr = user.addresses.id(id);
    if (!targetAddr) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }

    // Clear all defaults then set the target
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user.addresses.forEach((addr: any) => { addr.isDefault = false; });
    targetAddr.isDefault = true;

    await user.save();

    return NextResponse.json({ message: "Primary address updated", addresses: user.addresses });
  } catch (error) {
    console.error("Error setting primary address:", error);
    return NextResponse.json({ error: "Failed to set primary address" }, { status: 500 });
  }
}
