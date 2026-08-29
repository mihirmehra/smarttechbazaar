import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Settings from "@/models/Settings";
import { getFromMemoryCache, setInMemoryCache, invalidateMemoryCache } from "@/lib/cache";

// Settings are a single document read on many admin pages but changed rarely,
// so cache the payload in-process. Any update below clears it immediately.
const SETTINGS_CACHE_KEY = "admin:settings:v1";
const SETTINGS_TTL_MS = 60_000;

// GET settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const cached = getFromMemoryCache<Record<string, unknown>>(SETTINGS_CACHE_KEY);
    if (cached) {
      return NextResponse.json(cached);
    }

    await dbConnect();

    let settings = await Settings.findOne();

    if (!settings) {
      // Create default settings
      settings = await Settings.create({
        storeName: "Sabka Tech Bazar",
        storeEmail: "sales@sabkatechbazar.com",
        storePhone: "+91 6363677588",
        storeAddress: "2nd Floor, No. 94/1, Behind Sharda Theater, SP Road, Bangalore - 560002",
        businessGstin: "",
        businessState: "Karnataka",
        currency: "INR",
        currencySymbol: "₹",
        taxRate: 18,
        lowStockThreshold: 10,
        enableNotifications: true,
        maintenanceMode: false,
      });
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT update settings
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only super_admin can update settings
    if (session?.user?.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await request.json();

    await dbConnect();

    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create(data);
    } else {
      Object.assign(settings, data);
      settings.updatedAt = new Date();
      await settings.save();
    }

    invalidateMemoryCache(SETTINGS_CACHE_KEY);

    return NextResponse.json({
      message: "Settings updated successfully",
      settings,
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
