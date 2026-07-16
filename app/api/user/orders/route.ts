import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";

// GET current user's orders
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Use projection to only fetch needed fields and limit for initial load
    const orders = await Order.find({ user: session.user.id })
      .select("_id orderNumber total status createdAt items.name items.quantity items.image")
      .sort({ createdAt: -1 })
      .limit(50) // Limit for performance
      .lean();

    return NextResponse.json({ orders });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    return NextResponse.json({ error: "Failed to fetch orders" }, { status: 500 });
  }
}
