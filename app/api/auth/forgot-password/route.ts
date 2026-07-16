import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";
import { passwordResetCodeTemplate } from "@/lib/email-templates";

// Generate 6-digit reset code
function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// POST - Request password reset (send code to email)
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset code.",
      });
    }

    // Check if user has a password (not Google-only account)
    if (!user.password && user.googleId) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset code.",
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return NextResponse.json({
        message: "If an account exists with this email, you will receive a password reset code.",
      });
    }

    // Generate 6-digit reset code
    const resetCode = generateResetCode();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Save reset code to user
    await User.findByIdAndUpdate(user._id, {
      $set: {
        passwordResetToken: resetCode,
        passwordResetExpires: resetExpires,
      },
    });

    // Send reset email
    const resetEmail = passwordResetCodeTemplate(user.name, resetCode);
    await sendEmail({
      to: user.email,
      subject: `Password Reset Code - ${resetCode}`,
      html: resetEmail,
    });

    return NextResponse.json({
      message: "If an account exists with this email, you will receive a password reset code.",
    });
  } catch (error) {
    console.error("Password reset request error:", error);
    return NextResponse.json(
      { error: "Failed to process password reset request" },
      { status: 500 }
    );
  }
}
