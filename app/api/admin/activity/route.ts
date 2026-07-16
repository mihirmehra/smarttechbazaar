import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import ActivityLog from "@/models/ActivityLog";

// GET activity logs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Only super_admin can view all activity logs
    if (session?.user?.role !== "super_admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "50");
    const action = searchParams.get("action") || "";
    const resource = searchParams.get("resource") || "";
    const userId = searchParams.get("user") || "";

    const query: Record<string, unknown> = {};

    // Map frontend filter names to model field names
    if (action && action !== "all") {
      query.activityType = action;
    }

    if (resource && resource !== "all") {
      query.entityType = resource;
    }

    if (userId && userId !== "all") {
      query.user = userId;
    }

    const skip = (page - 1) * limit;

    const [rawActivities, total] = await Promise.all([
      ActivityLog.find(query)
        .populate("user", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ActivityLog.countDocuments(query),
    ]);

    // Get unique activityTypes and entityTypes for filters
    const [activityTypes, entityTypes] = await Promise.all([
      ActivityLog.distinct("activityType"),
      ActivityLog.distinct("entityType"),
    ]);

    // Transform activities to match frontend expected format
    const activities = rawActivities.map((activity) => ({
      _id: activity._id,
      user: activity.user,
      action: activity.activityType, // Map activityType to action for frontend
      resource: activity.entityType || "system", // Map entityType to resource for frontend
      resourceId: activity.entityId?.toString(),
      details: activity.description,
      metadata: activity.metadata,
      ipAddress: activity.ipAddress,
      createdAt: activity.createdAt,
    }));

    return NextResponse.json({
      activities,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters: {
        actions: activityTypes.filter(Boolean), // Filter out null/undefined
        resources: entityTypes.filter(Boolean),
      },
    });
  } catch (error) {
    console.error("Error fetching activity logs:", error);
    return NextResponse.json(
      { error: "Failed to fetch activity logs" },
      { status: 500 }
    );
  }
}
