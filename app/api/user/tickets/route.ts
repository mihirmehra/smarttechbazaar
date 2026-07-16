import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Ticket from "@/models/Ticket";

// GET current user's tickets
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const tickets = await Ticket.find({ user: session.user.id })
      .populate("order", "orderNumber total status")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ tickets });
  } catch (error) {
    console.error("Error fetching tickets:", error);
    return NextResponse.json({ error: "Failed to fetch tickets" }, { status: 500 });
  }
}

// POST create new ticket
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, description, category, priority, orderId } = await request.json();

    if (!subject || !description || !category) {
      return NextResponse.json({ error: "Subject, description, and category are required" }, { status: 400 });
    }

    await dbConnect();

    // Generate ticketNumber here so it satisfies the required validator
    // (pre-save hooks run after validation, so required: true would fail without this)
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const ticketNumber = `TKT${year}${month}${random}`;

    const ticketData: Record<string, unknown> = {
      ticketNumber,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority: priority || "medium",
      status: "open",
      user: session.user.id,
      replies: [],
      attachments: [],
      tags: [],
      isEscalated: false,
    };

    if (orderId) ticketData.order = orderId;

    const ticket = await Ticket.create(ticketData);

    return NextResponse.json(
      { message: "Ticket created successfully", ticket },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating ticket:", error);
    return NextResponse.json({ error: "Failed to create ticket" }, { status: 500 });
  }
}
