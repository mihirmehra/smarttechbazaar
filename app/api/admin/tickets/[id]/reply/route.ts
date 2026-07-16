import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import mongoose from "mongoose";
import Ticket, { ITicketReply } from "@/models/Ticket";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";
import { ticketReplyTemplate } from "@/lib/email-templates";
import { sendTicketReplyNotification, sendTicketResolvedNotification } from "@/lib/push-notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST add reply to ticket
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { message, isInternal } = await request.json();

    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const ticket = await Ticket.findById(id);

    if (!ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const reply: ITicketReply = {
      _id: new mongoose.Types.ObjectId(),
      user: new mongoose.Types.ObjectId(session.user.id),
      userName: session.user.name || "Admin",
      userRole: session.user.role as ITicketReply["userRole"],
      message: message.trim(),
      attachments: [],
      isInternal: isInternal || false,
      createdAt: new Date(),
    };

    ticket.replies.push(reply);

    // Set firstResponseAt if this is the first admin reply
    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date();
    }

    // If ticket is open and admin replies, change to in_progress
    if (ticket.status === "open") {
      ticket.status = "in_progress";
    }

    await ticket.save();

    const rawTicket = await Ticket.findById(id)
      .populate("user", "name email phone")
      .populate("assignedTo", "name email")
      .populate("replies.user", "name email role")
      .lean();
    
    // Map 'user' to 'customer' for frontend compatibility
    const updatedTicket = rawTicket ? {
      ...rawTicket,
      customer: rawTicket.user,
    } : null;

    // Send email notification to customer (only for non-internal replies)
    if (!isInternal) {
      const customer = await User.findById(ticket.user);
      if (customer) {
        const isResolved = ticket.status === "resolved" || ticket.status === "closed";
        const replyEmail = ticketReplyTemplate(
          customer.name,
          ticket.ticketNumber,
          ticket.subject,
          message.trim(),
          session.user.name || "Support Team",
          isResolved
        );
        await sendEmail({
          to: customer.email,
          subject: `Re: ${ticket.subject} - Ticket ${ticket.ticketNumber}`,
          html: replyEmail,
        });

        // Send push notification to customer's mobile app
        try {
          if (isResolved) {
            await sendTicketResolvedNotification(
              ticket.user.toString(),
              ticket.ticketNumber,
              ticket._id.toString()
            );
          } else {
            await sendTicketReplyNotification(
              ticket.user.toString(),
              ticket.ticketNumber,
              ticket._id.toString(),
              session.user.name || "Support Team"
            );
          }
        } catch (pushError) {
          console.error("Failed to send push notification:", pushError);
        }
      }
    }

    return NextResponse.json({
      message: "Reply added successfully",
      ticket: updatedTicket,
    });
  } catch (error) {
    console.error("Error adding reply:", error);
    return NextResponse.json(
      { error: "Failed to add reply" },
      { status: 500 }
    );
  }
}
