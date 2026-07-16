import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import {
  validateName,
  validatePhoneNumber,
  validateAddress,
  validatePincode,
  sanitizeString,
} from "@/lib/validation";

// GET all addresses
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id).select("addresses").lean();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ addresses: user.addresses || [] });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json({ error: "Failed to fetch addresses" }, { status: 500 });
  }
}

// POST add new address
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, phone, address, city, state, pincode, isDefault } = await request.json();

    if (!name || !phone || !address || !city || !state || !pincode) {
      return NextResponse.json({ error: "All fields are required" }, { status: 400 });
    }

    // Validate and sanitize inputs for security
    const nameValidation = validateName(name);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    const phoneValidation = validatePhoneNumber(phone);
    if (!phoneValidation.valid) {
      return NextResponse.json({ error: phoneValidation.error }, { status: 400 });
    }

    const addressValidation = validateAddress(address);
    if (!addressValidation.valid) {
      return NextResponse.json({ error: addressValidation.error }, { status: 400 });
    }

    const pincodeValidation = validatePincode(pincode);
    if (!pincodeValidation.valid) {
      return NextResponse.json({ error: pincodeValidation.error }, { status: 400 });
    }

    // Sanitize city and state
    const sanitizedCity = sanitizeString(city, 100);
    const sanitizedState = sanitizeString(state, 50);

    if (!sanitizedCity || sanitizedCity.length < 2) {
      return NextResponse.json({ error: "Invalid city name" }, { status: 400 });
    }

    if (!sanitizedState || sanitizedState.length < 2) {
      return NextResponse.json({ error: "Invalid state name" }, { status: 400 });
    }

    await dbConnect();

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Limit addresses to prevent abuse (max 10 addresses per user)
    if (user.addresses.length >= 10) {
      return NextResponse.json({ error: "Maximum 10 addresses allowed" }, { status: 400 });
    }

    // If this is the first address or user wants it as default, clear other defaults
    const shouldSetDefault = isDefault || user.addresses.length === 0;
    if (shouldSetDefault) {
      user.addresses.forEach((addr) => { addr.isDefault = false; });
    }

    user.addresses.push({
      name: nameValidation.normalized,
      phone: phoneValidation.normalized,
      address: addressValidation.normalized,
      city: sanitizedCity,
      state: sanitizedState,
      pincode: pincodeValidation.normalized,
      isDefault: shouldSetDefault,
    } as typeof user.addresses[0]);

    await user.save();

    return NextResponse.json(
      { message: "Address added successfully", addresses: user.addresses },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error adding address:", error);
    return NextResponse.json({ error: "Failed to add address" }, { status: 500 });
  }
}
