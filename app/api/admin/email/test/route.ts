import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { sendEmail, verifyEmailConnection, COMPANY_EMAIL } from "@/lib/email";
import {
  welcomeEmailTemplate,
  newUserNotificationTemplate,
  passwordResetTemplate,
  orderConfirmationTemplate,
  orderStatusUpdateTemplate,
  ticketCreatedTemplate,
  ticketReplyTemplate,
  lowStockAlertTemplate,
} from "@/lib/email-templates";

// POST - Send test email
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { type, to } = await request.json();

    if (!to) {
      return NextResponse.json(
        { error: "Recipient email is required" },
        { status: 400 }
      );
    }

    let emailHtml = "";
    let subject = "";

    switch (type) {
      case "welcome":
        emailHtml = welcomeEmailTemplate("Test User");
        subject = "Welcome to SabKaTechBazar!";
        break;

      case "new_user":
        emailHtml = newUserNotificationTemplate(
          "Test User",
          "test@example.com",
          new Date().toLocaleString("en-IN")
        );
        subject = "New User Registration";
        break;

      case "password_reset_temp":
        emailHtml = passwordResetTemplate("Test User", "temporary", "abc123xyz");
        subject = "Your Temporary Password";
        break;

      case "password_reset_link":
        emailHtml = passwordResetTemplate(
          "Test User",
          "link",
          "https://example.com/reset?token=abc123"
        );
        subject = "Reset Your Password";
        break;

      case "order_confirmation":
        emailHtml = orderConfirmationTemplate(
          "Test User",
          "ORD-000001",
          new Date().toLocaleDateString("en-IN", { dateStyle: "full" }),
          [
            { name: "iPhone 15 Pro", quantity: 1, price: 134900 },
            { name: "AirPods Pro", quantity: 2, price: 24900 },
          ],
          184700,
          0,
          9235,
          193935,
          "John Doe\n123 Test Street\nMumbai, Maharashtra 400001\nIndia\nPhone: +91 9876543210"
        );
        subject = "Order Confirmed - ORD-000001";
        break;

      case "order_status":
        emailHtml = orderStatusUpdateTemplate(
          "Test User",
          "ORD-000001",
          "shipped",
          "TRK123456789",
          new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { dateStyle: "full" })
        );
        subject = "Order ORD-000001 - SHIPPED";
        break;

      case "ticket_created":
        emailHtml = ticketCreatedTemplate(
          "Test User",
          "TKT-000001",
          "Order not received",
          "high",
          "I placed an order 5 days ago but haven't received it yet. Please help."
        );
        subject = "Support Ticket Created - TKT-000001";
        break;

      case "ticket_reply":
        emailHtml = ticketReplyTemplate(
          "Test User",
          "TKT-000001",
          "Order not received",
          "We apologize for the delay. Your order has been dispatched and will arrive within 2 days.",
          "Support Team",
          false
        );
        subject = "Re: Order not received - Ticket TKT-000001";
        break;

      case "low_stock":
        emailHtml = lowStockAlertTemplate([
          { name: "iPhone 15 Pro", sku: "IP15P-256", currentStock: 3, reorderLevel: 10 },
          { name: "MacBook Pro 14", sku: "MBP14-512", currentStock: 1, reorderLevel: 5 },
        ]);
        subject = "Low Stock Alert: 2 products need attention";
        break;

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    const success = await sendEmail({
      to,
      subject: `[TEST] ${subject}`,
      html: emailHtml,
    });

    if (success) {
      return NextResponse.json({
        message: "Test email sent successfully",
        to,
        type,
      });
    } else {
      return NextResponse.json(
        { error: "Failed to send test email" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error sending test email:", error);
    return NextResponse.json(
      { error: "Failed to send test email" },
      { status: 500 }
    );
  }
}

// GET - Verify email connection
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await verifyEmailConnection();

    return NextResponse.json({
      connected: result.success,
      error: result.error,
      email: COMPANY_EMAIL,
      smtpUser: process.env.SMTP_USER || "Not configured",
    });
  } catch (error) {
    console.error("Error verifying email connection:", error);
    return NextResponse.json(
      { error: "Failed to verify email connection", connected: false },
      { status: 500 }
    );
  }
}
