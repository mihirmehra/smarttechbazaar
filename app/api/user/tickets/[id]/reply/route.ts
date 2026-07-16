import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import Ticket, { ITicketReply } from "@/models/Ticket";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST add reply to ticket (customer)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    await dbConnect();

    // Customer can only reply to their own tickets
    const ticket = await Ticket.findOne({ _id: id, user: session.user.id });
    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (ticket.status === "closed") {
      return NextResponse.json({ error: "Cannot reply to a closed ticket" }, { status: 400 });
    }

    const reply: ITicketReply = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(session.user.id),
      userName: session.user.name || "Customer",
      userRole: "customer",
      message: message.trim(),
      attachments: [],
      isInternal: false,
      createdAt: new Date(),
    };

    ticket.replies.push(reply);

    // If ticket was resolved/waiting, reopen to in_progress when customer replies
    if (ticket.status === "resolved" || ticket.status === "waiting") {
      ticket.status = "open";
    }

    await ticket.save();

    const updatedTicket = await Ticket.findById(id)
      .populate("order", "orderNumber total status")
      .populate("replies.user", "name role")
      .lean();

    return NextResponse.json({ message: "Reply added successfully", ticket: updatedTicket });
  } catch (error) {
    console.error("Error adding reply:", error);
    return NextResponse.json({ error: "Failed to add reply" }, { status: 500 });
  }
}
