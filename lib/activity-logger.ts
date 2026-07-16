import dbConnect from "@/lib/mongodb";
import ActivityLog, { ActivityType } from "@/models/ActivityLog";
import { headers } from "next/headers";

interface LogActivityParams {
  userId: string;
  userName: string;
  userRole: "customer" | "admin" | "super_admin";
  activityType: ActivityType;
  description: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Log an activity to the activity log collection.
 * This should be called after successful admin/user actions.
 */
export async function logActivity(params: LogActivityParams): Promise<void> {
  try {
    await dbConnect();

    // Get IP address from headers (best effort)
    let ipAddress: string | undefined;
    let userAgent: string | undefined;
    
    try {
      const headersList = await headers();
      ipAddress = headersList.get("x-forwarded-for")?.split(",")[0].trim() || 
                  headersList.get("x-real-ip") || 
                  undefined;
      userAgent = headersList.get("user-agent") || undefined;
    } catch {
      // Headers may not be available in all contexts
    }

    await ActivityLog.create({
      user: params.userId,
      userName: params.userName,
      userRole: params.userRole,
      activityType: params.activityType,
      description: params.description,
      entityType: params.entityType,
      entityId: params.entityId,
      metadata: params.metadata,
      ipAddress,
      userAgent,
    });
  } catch (error) {
    // Log error but don't throw - activity logging should not break main functionality
    console.error("Failed to log activity:", error);
  }
}

/**
 * Helper to log admin actions
 */
export async function logAdminAction(
  userId: string,
  userName: string,
  userRole: "admin" | "super_admin",
  activityType: ActivityType,
  description: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logActivity({
    userId,
    userName,
    userRole,
    activityType,
    description,
    entityType,
    entityId,
    metadata,
  });
}

/**
 * Helper to log customer actions
 */
export async function logCustomerAction(
  userId: string,
  userName: string,
  activityType: ActivityType,
  description: string,
  entityType?: string,
  entityId?: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  return logActivity({
    userId,
    userName,
    userRole: "customer",
    activityType,
    description,
    entityType,
    entityId,
    metadata,
  });
}
