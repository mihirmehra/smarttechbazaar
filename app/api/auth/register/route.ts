import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sendEmail, COMPANY_EMAIL } from "@/lib/email";
import { emailVerificationCodeTemplate, newUserNotificationTemplate } from "@/lib/email-templates";

// Generate 8-digit verification code
function generateVerificationCode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, password } = await request.json();

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    await dbConnect();

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Create user with verification code
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      password: hashedPassword,
      role: "customer",
      isActive: true,
      isEmailVerified: false,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
      isOnboardingComplete: false,
      isGstVerified: false,
    });

    // Send verification code email
    const verificationEmail = emailVerificationCodeTemplate(name, verificationCode);
    await sendEmail({
      to: email.toLowerCase(),
      subject: `Verify your email - ${verificationCode}`,
      html: verificationEmail,
    });

    // Send notification email to admin
    const registrationDate = new Date().toLocaleString("en-IN", {
      dateStyle: "full",
      timeStyle: "short",
    });
    const adminNotification = newUserNotificationTemplate(name, email.toLowerCase(), registrationDate);
    await sendEmail({
      to: COMPANY_EMAIL,
      subject: `New User Registration: ${name}`,
      html: adminNotification,
    });

    return NextResponse.json(
      {
        message: "Account created successfully. Please verify your email.",
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isEmailVerified: false,
          isOnboardingComplete: false,
        },
        requiresVerification: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
