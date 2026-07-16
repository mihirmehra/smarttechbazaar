import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { sendPushNotification } from "@/lib/push-notifications";

export async function POST() {
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

    // Check if user has push devices registered
    if (!user.pushDevices || user.pushDevices.length === 0) {
      // Still return success for local notification fallback
      return NextResponse.json({ 
        message: "No push devices registered, but local notification can be shown",
        success: true,
        localOnly: true
      });
    }

    // Send test push notification via OneSignal
    try {
      await sendPushNotification({
        userId: session.user.id,
        title: "Test Notification",
        message: "Push notifications are working correctly!",
        type: "announcement",
        data: {
          testId: "test",
          timestamp: new Date().toISOString(),
        },
      });

      return NextResponse.json({ 
        message: "Test notification sent successfully",
        success: true
      });
    } catch (pushError) {
      console.error("Push notification error:", pushError);
      // Return success anyway for local notification fallback
      return NextResponse.json({ 
        message: "Push service error, but local notification can be shown",
        success: true,
        localOnly: true
      });
    }
  } catch (error) {
    console.error("Error sending test notification:", error);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
