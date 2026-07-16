import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

// POST - Reset password with verified token
export async function POST(request: NextRequest) {
  try {
    const { email, token, newPassword } = await request.json();

    if (!email || !token || !newPassword) {
      return NextResponse.json(
        { error: "Email, verification token, and new password are required" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check if user has a reset code
    if (!user.passwordResetToken) {
      return NextResponse.json(
        { error: "No active password reset request. Please request a new code." },
        { status: 400 }
      );
    }

    // Verify the token matches
    try {
      const decodedToken = Buffer.from(token, "base64").toString("utf-8");
      const [tokenEmail, tokenCode] = decodedToken.split(":");
      
      if (tokenEmail.toLowerCase() !== email.toLowerCase() || tokenCode !== user.passwordResetToken) {
        return NextResponse.json(
          { error: "Invalid verification token" },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Invalid verification token" },
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

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password and clear reset fields
    await User.findByIdAndUpdate(user._id, {
      $set: { password: hashedPassword },
      $unset: { passwordResetToken: 1, passwordResetExpires: 1 },
    });

    return NextResponse.json({
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
