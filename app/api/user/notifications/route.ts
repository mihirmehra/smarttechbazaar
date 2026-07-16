import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Notification from "@/models/Notification";
import User from "@/models/User";

// GET user's notifications or preferences
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    
    // If requesting preferences only
    if (searchParams.get("preferences") === "true") {
      const user = await User.findById(session.user.id)
        .select("notificationPreferences pushDevices")
        .lean();
      
      return NextResponse.json({
        preferences: user?.notificationPreferences || {
          orderUpdates: true,
          promotions: true,
          priceDrops: true,
          supportMessages: true,
          announcements: true,
        },
        devicesRegistered: user?.pushDevices?.length || 0,
      });
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const unreadOnly = searchParams.get("unread") === "true";

    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = { user: session.user.id };
    if (unreadOnly) {
      query.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Notification.countDocuments(query),
      Notification.countDocuments({ user: session.user.id, isRead: false }),
    ]);

    return NextResponse.json({
      notifications: JSON.parse(JSON.stringify(notifications)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Failed to fetch notifications" },
      { status: 500 }
    );
  }
}

// POST register device for push notifications
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { deviceToken, platform } = await request.json();

    if (!deviceToken) {
      return NextResponse.json({ error: "Device token required" }, { status: 400 });
    }

    await dbConnect();

    // Add device to user's push devices (avoid duplicates)
    await User.findByIdAndUpdate(
      session.user.id,
      {
        $addToSet: {
          pushDevices: {
            token: deviceToken,
            platform: platform || "web",
            registeredAt: new Date(),
          },
        },
      }
    );

    return NextResponse.json({
      message: "Device registered for push notifications",
    });
  } catch (error) {
    console.error("Error registering device:", error);
    return NextResponse.json(
      { error: "Failed to register device" },
      { status: 500 }
    );
  }
}

// PATCH update notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { preferences } = await request.json();

    if (!preferences || typeof preferences !== "object") {
      return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
    }

    await dbConnect();

    // Update only the provided preferences
    const updateFields: Record<string, boolean> = {};
    const validKeys = ["orderUpdates", "promotions", "priceDrops", "supportMessages", "announcements"];
    
    for (const key of validKeys) {
      if (key in preferences && typeof preferences[key] === "boolean") {
        updateFields[`notificationPreferences.${key}`] = preferences[key];
      }
    }

    if (Object.keys(updateFields).length === 0) {
      return NextResponse.json({ error: "No valid preferences to update" }, { status: 400 });
    }

    await User.findByIdAndUpdate(session.user.id, { $set: updateFields });

    return NextResponse.json({
      message: "Preferences updated",
    });
  } catch (error) {
    console.error("Error updating preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}

// PUT mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { notificationIds, markAll } = await request.json();

    await dbConnect();

    if (markAll) {
      // Mark all as read
      await Notification.updateMany(
        { user: session.user.id, isRead: false },
        { isRead: true }
      );
    } else if (notificationIds && Array.isArray(notificationIds)) {
      // Mark specific notifications as read
      await Notification.updateMany(
        { _id: { $in: notificationIds }, user: session.user.id },
        { isRead: true }
      );
    }

    const unreadCount = await Notification.countDocuments({
      user: session.user.id,
      isRead: false,
    });

    return NextResponse.json({
      message: "Notifications updated",
      unreadCount,
    });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}

// DELETE clear notifications
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const clearAll = searchParams.get("all") === "true";
    const clearRead = searchParams.get("read") === "true";

    await dbConnect();

    const query: Record<string, unknown> = { user: session.user.id };
    
    if (clearRead && !clearAll) {
      query.isRead = true;
    }

    await Notification.deleteMany(query);

    return NextResponse.json({
      message: "Notifications cleared",
    });
  } catch (error) {
    console.error("Error clearing notifications:", error);
    return NextResponse.json(
      { error: "Failed to clear notifications" },
      { status: 500 }
    );
  }
}
