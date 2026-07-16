import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import Order from "@/models/Order";
import Review from "@/models/Review";
import Ticket from "@/models/Ticket";

// Helper to anonymize user data
function anonymizeEmail(userId: string): string {
  return `deleted_${userId}@deleted.smarttechbazaar.com`;
}

// POST - Request account deletion (with confirmation)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { confirmEmail, reason } = body;

    await dbConnect();

    // Get user
    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Verify email confirmation matches
    if (confirmEmail?.toLowerCase() !== user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "Email confirmation does not match your account email" },
        { status: 400 }
      );
    }

    // Check for pending orders
    const pendingOrders = await Order.countDocuments({
      user: session.user.id,
      status: { $in: ["pending", "processing", "shipped"] },
    });

    if (pendingOrders > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete account with pending orders",
          pendingOrders,
          message: "Please wait for all orders to be delivered or cancelled before deleting your account."
        },
        { status: 400 }
      );
    }

    // Check for open support tickets
    const openTickets = await Ticket.countDocuments({
      user: session.user.id,
      status: { $in: ["open", "in_progress"] },
    });

    if (openTickets > 0) {
      return NextResponse.json(
        { 
          error: "Cannot delete account with open support tickets",
          openTickets,
          message: "Please close or resolve all support tickets before deleting your account."
        },
        { status: 400 }
      );
    }

    const userId = user._id.toString();

    // 1. Anonymize reviews (keep for product integrity but remove personal info)
    await Review.updateMany(
      { user: session.user.id },
      { 
        $set: { 
          userName: "Deleted User",
          isAnonymized: true
        }
      }
    );

    // 2. Close any tickets and mark as deleted user
    await Ticket.updateMany(
      { user: session.user.id },
      { 
        $set: { 
          status: "closed",
          closedReason: "Account deleted by user"
        }
      }
    );

    // 3. Keep order history but anonymize (required for legal/tax purposes)
    await Order.updateMany(
      { user: session.user.id },
      {
        $set: {
          "customerName": "Deleted User",
          "customerEmail": anonymizeEmail(userId),
          "customerPhone": "DELETED",
          "shippingAddress.name": "Deleted User",
          "shippingAddress.phone": "DELETED",
          "billingAddress.name": "Deleted User",
          "billingAddress.phone": "DELETED",
          isUserDeleted: true
        }
      }
    );

    // 4. Log deletion reason for analytics (optional)
    console.log(`Account deletion requested: User ${userId}, Reason: ${reason || "Not provided"}`);

    // 5. Delete the user account
    await User.findByIdAndDelete(session.user.id);

    return NextResponse.json({ 
      success: true,
      message: "Your account has been successfully deleted. Thank you for using Smart Tech Bazaar."
    });

  } catch (error) {
    console.error("Error deleting account:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again or contact support." },
      { status: 500 }
    );
  }
}

// GET - Check account deletion eligibility
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id).select("email name createdAt").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check for pending orders
    const pendingOrders = await Order.countDocuments({
      user: session.user.id,
      status: { $in: ["pending", "processing", "shipped"] },
    });

    // Check for open support tickets
    const openTickets = await Ticket.countDocuments({
      user: session.user.id,
      status: { $in: ["open", "in_progress"] },
    });

    // Get total orders count (for info)
    const totalOrders = await Order.countDocuments({
      user: session.user.id,
    });

    // Get reviews count
    const totalReviews = await Review.countDocuments({
      user: session.user.id,
    });

    const canDelete = pendingOrders === 0 && openTickets === 0;

    return NextResponse.json({
      canDelete,
      user: {
        email: user.email,
        name: user.name,
        memberSince: user.createdAt,
      },
      summary: {
        pendingOrders,
        openTickets,
        totalOrders,
        totalReviews,
      },
      blockers: [
        ...(pendingOrders > 0 ? [`You have ${pendingOrders} pending order(s)`] : []),
        ...(openTickets > 0 ? [`You have ${openTickets} open support ticket(s)`] : []),
      ],
    });

  } catch (error) {
    console.error("Error checking deletion eligibility:", error);
    return NextResponse.json(
      { error: "Failed to check eligibility" },
      { status: 500 }
    );
  }
}
