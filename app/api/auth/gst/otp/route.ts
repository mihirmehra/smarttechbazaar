import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { requestGSTOTP, verifyGSTOTP, validateGSTFormat } from "@/lib/sandbox-gst";

/**
 * POST - Request OTP for GST verification
 * Sends OTP to the registered mobile number and email of the GST account
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gstin, username } = await request.json();

    if (!gstin || !username) {
      return NextResponse.json(
        { error: "GST number and username are required" },
        { status: 400 }
      );
    }

    // Validate GST format first
    const formatValidation = validateGSTFormat(gstin);
    if (!formatValidation.valid) {
      return NextResponse.json(
        { error: formatValidation.error },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Store the GST OTP request details for later verification
    user.gstOtpRequest = {
      gstin: gstin.toUpperCase(),
      username: username.trim(),
      requestedAt: new Date(),
      attempts: 0,
    };
    await user.save();

    // Request OTP from Sandbox API
    const result = await requestGSTOTP(gstin, username);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send OTP" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: result.message || "OTP sent to your registered mobile number and email address.",
    });
  } catch (error) {
    console.error("GST OTP request error:", error);
    return NextResponse.json(
      { error: "Failed to send OTP. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * PUT - Verify OTP for GST verification
 * Verifies the OTP and marks the GST as verified if successful
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { otp } = await request.json();

    if (!otp) {
      return NextResponse.json(
        { error: "OTP is required" },
        { status: 400 }
      );
    }

    await dbConnect();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if there's a pending OTP request
    if (!user.gstOtpRequest || !user.gstOtpRequest.gstin || !user.gstOtpRequest.username) {
      return NextResponse.json(
        { error: "No pending OTP verification. Please request a new OTP." },
        { status: 400 }
      );
    }

    // Check if request is expired (10 minutes)
    const requestedAt = new Date(user.gstOtpRequest.requestedAt);
    const expiresAt = new Date(requestedAt.getTime() + 10 * 60 * 1000);
    if (new Date() > expiresAt) {
      return NextResponse.json(
        { error: "OTP has expired. Please request a new OTP." },
        { status: 400 }
      );
    }

    // Check attempt limit (max 3 attempts)
    if (user.gstOtpRequest.attempts >= 3) {
      return NextResponse.json(
        { error: "Too many attempts. Please request a new OTP." },
        { status: 400 }
      );
    }

    // Increment attempts
    user.gstOtpRequest.attempts += 1;
    await user.save();

    // Verify OTP with Sandbox API
    const result = await verifyGSTOTP(
      user.gstOtpRequest.gstin,
      user.gstOtpRequest.username,
      otp
    );

    if (!result.success || !result.verified) {
      return NextResponse.json(
        { 
          error: result.error || "OTP verification failed", 
          attemptsRemaining: 3 - user.gstOtpRequest.attempts 
        },
        { status: 400 }
      );
    }

    // Check if GST is already registered to another user
    const existingGST = await User.findOne({
      gstNumber: user.gstOtpRequest.gstin,
      _id: { $ne: session.user.id },
    });

    if (existingGST) {
      return NextResponse.json(
        { error: "This GST number is already registered to another account" },
        { status: 400 }
      );
    }

    // OTP verified successfully - update user
    user.gstNumber = user.gstOtpRequest.gstin;
    user.isGstVerified = true;
    user.isGstOtpVerified = true;
    user.gstVerificationMethod = "otp";
    user.gstOtpRequest = undefined; // Clear the OTP request data
    
    await user.save();

    return NextResponse.json({
      success: true,
      verified: true,
      message: result.message || "GST verified successfully!",
      gstNumber: user.gstNumber,
    });
  } catch (error) {
    console.error("GST OTP verify error:", error);
    return NextResponse.json(
      { error: "Failed to verify OTP. Please try again." },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Cancel/reset OTP verification process
 */
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Clear the OTP request data
    user.gstOtpRequest = undefined;
    await user.save();

    return NextResponse.json({
      success: true,
      message: "OTP verification cancelled",
    });
  } catch (error) {
    console.error("GST OTP cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel OTP verification" },
      { status: 500 }
    );
  }
}
