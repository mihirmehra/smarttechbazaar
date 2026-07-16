import { NextRequest, NextResponse } from "next/server";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// POST - Verify reset code
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    if (code.length !== 6) {
      return NextResponse.json(
        { error: "Invalid verification code format" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() }).lean();

    if (!user) {
      return NextResponse.json(
        { error: "Invalid or expired reset code" },
        { status: 400 }
      );
    }

    // Check if user has a reset code
    if (!user.passwordResetToken) {
      return NextResponse.json(
        { error: "No reset code found. Please request a new one." },
        { status: 400 }
      );
    }

    // Trim and normalize both codes for comparison
    const submittedCode = String(code).trim();
    const storedCode = String(user.passwordResetToken).trim();

    // Check if code matches
    if (storedCode !== submittedCode) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (user.passwordResetExpires && new Date() > new Date(user.passwordResetExpires)) {
      return NextResponse.json(
        { error: "Reset code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Generate a temporary verification token for the reset password step
    // This prevents the user from needing to re-enter the code
    const verificationToken = Buffer.from(`${email}:${storedCode}:${Date.now()}`).toString("base64");

    return NextResponse.json({
      message: "Code verified successfully",
      verified: true,
      token: verificationToken,
    });
  } catch (error) {
    console.error("Verify reset code error:", error);
    return NextResponse.json(
      { error: "Failed to verify reset code" },
      { status: 500 }
    );
  }
}
