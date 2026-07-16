import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sendEmail } from "@/lib/email";
import { emailVerificationCodeTemplate } from "@/lib/email-templates";

// Generate 8-digit verification code
function generateVerificationCode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

// POST - Verify email with code
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { code } = await request.json();

    if (!code || code.length !== 8) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Use lean() to get plain JS object to ensure all fields are returned
    // This bypasses any Mongoose schema field filtering
    const user = await User.findById(session.user.id).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { message: "Email already verified", isEmailVerified: true }
      );
    }

    // Check if user has a verification code
    if (!user.emailVerificationCode) {
      return NextResponse.json(
        { error: "No verification code found. Please request a new one." },
        { status: 400 }
      );
    }

    // Trim and normalize both codes for comparison
    const submittedCode = String(code).trim();
    const storedCode = String(user.emailVerificationCode).trim();

    // Check if code matches
    if (storedCode !== submittedCode) {
      return NextResponse.json(
        { error: "Invalid verification code" },
        { status: 400 }
      );
    }

    // Check if code has expired
    if (user.emailVerificationExpires && new Date() > new Date(user.emailVerificationExpires)) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // Mark email as verified using findByIdAndUpdate to ensure persistence
    await User.findByIdAndUpdate(session.user.id, {
      $set: { isEmailVerified: true },
      $unset: { emailVerificationCode: 1, emailVerificationExpires: 1 },
    });

    return NextResponse.json({
      message: "Email verified successfully",
      isEmailVerified: true,
    });
  } catch (error) {
    console.error("Email verification error:", error);
    return NextResponse.json(
      { error: "Failed to verify email" },
      { status: 500 }
    );
  }
}

// PUT - Resend verification code
export async function PUT() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    // Use lean() to get plain JS object
    const user = await User.findById(session.user.id).lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (user.isEmailVerified) {
      return NextResponse.json(
        { message: "Email already verified", isEmailVerified: true }
      );
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Use findByIdAndUpdate with $set to ensure the update is persisted
    const updatedUser = await User.findByIdAndUpdate(
      session.user.id,
      {
        $set: {
          emailVerificationCode: verificationCode,
          emailVerificationExpires: verificationExpires,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
    }

    // Send new verification email
    const verificationEmail = emailVerificationCodeTemplate(user.name, verificationCode);
    await sendEmail({
      to: user.email,
      subject: `Verify your email - ${verificationCode}`,
      html: verificationEmail,
    });

    return NextResponse.json({
      message: "Verification code sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Failed to resend verification code" },
      { status: 500 }
    );
  }
}
