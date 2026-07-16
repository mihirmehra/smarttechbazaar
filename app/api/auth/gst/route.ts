import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { verifyGSTNumber, validateGSTFormat } from "@/lib/sandbox-gst";

// State codes mapping for GST
const STATE_CODES: { [key: string]: string } = {
  "01": "Jammu & Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra & Nagar Haveli and Daman & Diu",
  "27": "Maharashtra",
  "28": "Andhra Pradesh (Old)",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman & Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
};

// POST - Submit GST number with verification
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { gstNumber, businessName, businessType } = await request.json();

    await dbConnect();

    const user = await User.findById(session.user.id);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check if GST was verified via OTP
    const isOtpVerified = user.isGstOtpVerified && user.gstNumber === gstNumber.toUpperCase();

    // If not OTP verified, verify GST number with Sandbox API (public lookup)
    if (!isOtpVerified) {
      const verification = await verifyGSTNumber(gstNumber);
      
      if (!verification.valid) {
        return NextResponse.json(
          { 
            error: verification.error || "Invalid GST number",
            verified: verification.verified,
          },
          { status: 400 }
        );
      }

      // Store verification data from public API
      if (verification.data) {
        user.gstVerifiedData = {
          legalName: verification.data.legalName,
          tradeName: verification.data.tradeName,
          state: verification.data.state,
          stateCode: verification.data.stateCode,
          registrationDate: verification.data.registrationDate,
          constitutionOfBusiness: verification.data.constitutionOfBusiness,
          taxpayerType: verification.data.taxpayerType,
          status: verification.data.status,
          verifiedAt: new Date(),
        };
      }
      
      // Mark as verified via public API (not OTP)
      user.gstVerificationMethod = "public_api";
    }

    // Check if GST is already registered to another user
    const existingGST = await User.findOne({
      gstNumber: gstNumber.toUpperCase(),
      _id: { $ne: session.user.id },
    });

    if (existingGST) {
      return NextResponse.json(
        { error: "This GST number is already registered to another account" },
        { status: 400 }
      );
    }

    // Update user with GST details
    user.gstNumber = gstNumber.toUpperCase();
    user.businessName = businessName || user.gstVerifiedData?.tradeName || user.gstVerifiedData?.legalName || "";
    user.businessType = businessType || "other";
    user.isGstVerified = true;
    user.isOnboardingComplete = true;
    
    await user.save();

    return NextResponse.json({
      message: "GST details saved successfully",
      gstNumber: user.gstNumber,
      businessName: user.businessName,
      state: user.gstVerifiedData?.state || STATE_CODES[gstNumber.substring(0, 2)],
      isGstVerified: true,
      isGstOtpVerified: user.isGstOtpVerified || false,
      isOnboardingComplete: true,
      verificationMethod: user.gstVerificationMethod,
    });
  } catch (error) {
    console.error("GST submission error:", error);
    return NextResponse.json(
      { error: "Failed to save GST details" },
      { status: 500 }
    );
  }
}

// PUT - Skip GST (complete onboarding without GST)
export async function PUT(request: NextRequest) {
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

    // Complete onboarding without GST
    user.isOnboardingComplete = true;
    user.isGstVerified = false;
    await user.save();

    return NextResponse.json({
      message: "Onboarding completed",
      isOnboardingComplete: true,
      isGstVerified: false,
    });
  } catch (error) {
    console.error("Skip GST error:", error);
    return NextResponse.json(
      { error: "Failed to complete onboarding" },
      { status: 500 }
    );
  }
}

// GET - Verify GST number (real-time validation with Sandbox API)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const gstNumber = searchParams.get("gst");

  if (!gstNumber) {
    return NextResponse.json(
      { error: "GST number is required" },
      { status: 400 }
    );
  }

  // First do format validation
  const formatValidation = validateGSTFormat(gstNumber);
  if (!formatValidation.valid) {
    return NextResponse.json({
      valid: false,
      verified: false,
      error: formatValidation.error,
    });
  }

  // Then verify with Sandbox API
  const verification = await verifyGSTNumber(gstNumber);

  return NextResponse.json({
    valid: verification.valid,
    verified: verification.verified,
    error: verification.error,
    state: verification.data?.state || STATE_CODES[gstNumber.substring(0, 2)],
    businessName: verification.data?.businessName,
    legalName: verification.data?.legalName,
    status: verification.data?.status,
    taxpayerType: verification.data?.taxpayerType,
  });
}
