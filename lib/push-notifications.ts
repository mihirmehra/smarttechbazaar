/**
 * Server-side Push Notification Service using OneSignal REST API
 * 
 * This service handles sending push notifications to mobile app users
 * via OneSignal for both iOS (APNs) and Android (FCM)
 */

import dbConnect from "@/lib/mongodb";
import User from "@/models/User";

const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;
const ONESIGNAL_API_URL = "https://onesignal.com/api/v1/notifications";

export type NotificationType = 
  | "order_placed"
  | "order_status"
  | "order_shipped"
  | "order_delivered"
  | "order_cancelled"
  | "payment_received"
  | "payment_refunded"
  | "ticket_reply"
  | "ticket_resolved"
  | "price_drop"
  | "promotion"
  | "announcement";

export interface PushNotificationPayload {
  userId: string;
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, string>;
  url?: string; // Deep link URL
  imageUrl?: string; // Rich notification image
}

export interface BulkPushNotificationPayload {
  userIds: string[];
  title: string;
  message: string;
  type: NotificationType;
  data?: Record<string, string>;
  url?: string;
  imageUrl?: string;
}

interface OneSignalNotificationResponse {
  id?: string;
  recipients?: number;
  errors?: string[];
}

/**
 * Check if push notifications are properly configured
 */
export function isPushNotificationsConfigured(): boolean {
  return !!(ONESIGNAL_APP_ID && ONESIGNAL_REST_API_KEY);
}

/**
 * Get notification preference key for a notification type
 */
function getPreferenceKey(type: NotificationType): keyof NonNullable<import("@/models/User").IUser["notificationPreferences"]> | null {
  const mapping: Record<NotificationType, keyof NonNullable<import("@/models/User").IUser["notificationPreferences"]> | null> = {
    order_placed: "orderUpdates",
    order_status: "orderUpdates",
    order_shipped: "orderUpdates",
    order_delivered: "orderUpdates",
    order_cancelled: "orderUpdates",
    payment_received: "orderUpdates",
    payment_refunded: "orderUpdates",
    ticket_reply: "supportMessages",
    ticket_resolved: "supportMessages",
    price_drop: "priceDrops",
    promotion: "promotions",
    announcement: "announcements",
  };
  return mapping[type];
}

/**
 * Send push notification to a single user
 */
export async function sendPushNotification(
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string; notificationId?: string }> {
  if (!isPushNotificationsConfigured()) {
    console.warn("Push notifications not configured. Skipping.");
    return { success: false, error: "Push notifications not configured" };
  }

  try {
    await dbConnect();

    // Get user with push devices and notification preferences
    const user = await User.findById(payload.userId).select(
      "pushDevices notificationPreferences"
    );

    if (!user) {
      return { success: false, error: "User not found" };
    }

    // Check user's notification preferences
    const preferenceKey = getPreferenceKey(payload.type);
    if (preferenceKey && user.notificationPreferences) {
      const isEnabled = user.notificationPreferences[preferenceKey];
      if (!isEnabled) {
        return { success: false, error: "User has disabled this notification type" };
      }
    }

    // Get user's push device tokens
    const pushDevices = user.pushDevices || [];
    if (pushDevices.length === 0) {
      return { success: false, error: "User has no registered push devices" };
    }

    // Extract tokens
    const playerIds = pushDevices.map((device: { token: string }) => device.token);

    // Build OneSignal notification payload
    const notificationPayload = {
      app_id: ONESIGNAL_APP_ID,
      include_player_ids: playerIds,
      headings: { en: payload.title },
      contents: { en: payload.message },
      data: {
        type: payload.type,
        ...payload.data,
      },
      // iOS specific
      ios_badgeType: "Increase",
      ios_badgeCount: 1,
      // Android specific
      android_channel_id: getAndroidChannelId(payload.type),
      // Deep link
      ...(payload.url && { url: payload.url }),
      // Rich notification with image
      ...(payload.imageUrl && { 
        big_picture: payload.imageUrl,
        ios_attachments: { id: payload.imageUrl },
      }),
      // TTL (time to live) - 24 hours
      ttl: 86400,
    };

    // Send notification via OneSignal REST API
    const response = await fetch(ONESIGNAL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify(notificationPayload),
    });

    const result: OneSignalNotificationResponse = await response.json();

    if (!response.ok) {
      console.error("OneSignal API error:", result);
      return { 
        success: false, 
        error: result.errors?.join(", ") || "Failed to send notification" 
      };
    }

    return { 
      success: true, 
      notificationId: result.id 
    };
  } catch (error) {
    console.error("Push notification error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendBulkPushNotification(
  payload: BulkPushNotificationPayload
): Promise<{ success: boolean; sent: number; failed: number; errors?: string[] }> {
  if (!isPushNotificationsConfigured()) {
    console.warn("Push notifications not configured. Skipping.");
    return { success: false, sent: 0, failed: payload.userIds.length, errors: ["Not configured"] };
  }

  try {
    await dbConnect();

    // Get all users with their push devices and preferences
    const users = await User.find({ 
      _id: { $in: payload.userIds } 
    }).select("pushDevices notificationPreferences");

    // Filter users who have devices and have enabled this notification type
    const preferenceKey = getPreferenceKey(payload.type);
    const eligibleTokens: string[] = [];

    for (const user of users) {
      // Check preferences
      if (preferenceKey && user.notificationPreferences) {
        const isEnabled = user.notificationPreferences[preferenceKey];
        if (!isEnabled) continue;
      }

      // Collect tokens
      const devices = user.pushDevices || [];
      for (const device of devices) {
        eligibleTokens.push(device.token);
      }
    }

    if (eligibleTokens.length === 0) {
      return { success: false, sent: 0, failed: payload.userIds.length, errors: ["No eligible devices"] };
    }

    // OneSignal allows max 2000 player IDs per request
    const batchSize = 2000;
    let totalSent = 0;
    let totalFailed = 0;
    const errors: string[] = [];

    for (let i = 0; i < eligibleTokens.length; i += batchSize) {
      const batch = eligibleTokens.slice(i, i + batchSize);

      const notificationPayload = {
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: batch,
        headings: { en: payload.title },
        contents: { en: payload.message },
        data: {
          type: payload.type,
          ...payload.data,
        },
        ios_badgeType: "Increase",
        ios_badgeCount: 1,
        android_channel_id: getAndroidChannelId(payload.type),
        ...(payload.url && { url: payload.url }),
        ...(payload.imageUrl && { 
          big_picture: payload.imageUrl,
          ios_attachments: { id: payload.imageUrl },
        }),
        ttl: 86400,
      };

      const response = await fetch(ONESIGNAL_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${ONESIGNAL_REST_API_KEY}`,
        },
        body: JSON.stringify(notificationPayload),
      });

      const result: OneSignalNotificationResponse = await response.json();

      if (response.ok && result.recipients) {
        totalSent += result.recipients;
      } else {
        totalFailed += batch.length;
        if (result.errors) {
          errors.push(...result.errors);
        }
      }
    }

    return {
      success: totalSent > 0,
      sent: totalSent,
      failed: totalFailed,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error("Bulk push notification error:", error);
    return {
      success: false,
      sent: 0,
      failed: payload.userIds.length,
      errors: [error instanceof Error ? error.message : "Unknown error"],
    };
  }
}

/**
 * Get Android notification channel ID based on notification type
 * These channels should be created in the Median.co app configuration
 */
function getAndroidChannelId(type: NotificationType): string {
  const channelMapping: Record<NotificationType, string> = {
    order_placed: "orders",
    order_status: "orders",
    order_shipped: "orders",
    order_delivered: "orders",
    order_cancelled: "orders",
    payment_received: "payments",
    payment_refunded: "payments",
    ticket_reply: "support",
    ticket_resolved: "support",
    price_drop: "deals",
    promotion: "deals",
    announcement: "general",
  };
  return channelMapping[type] || "general";
}

// ============================================
// Convenience functions for common notifications
// ============================================

/**
 * Send order placed notification
 */
export async function sendOrderPlacedNotification(
  userId: string,
  orderNumber: string,
  orderId: string,
  total: number
): Promise<void> {
  await sendPushNotification({
    userId,
    title: "Order Confirmed!",
    message: `Your order #${orderNumber} for ₹${total.toLocaleString("en-IN")} has been placed successfully.`,
    type: "order_placed",
    data: { orderId, orderNumber },
    url: `stb://orders/${orderId}`,
  });
}

/**
 * Send order status update notification
 */
export async function sendOrderStatusNotification(
  userId: string,
  orderNumber: string,
  orderId: string,
  status: string,
  trackingNumber?: string
): Promise<void> {
  const statusMessages: Record<string, { title: string; message: string; type: NotificationType }> = {
    processing: {
      title: "Order Processing",
      message: `Your order #${orderNumber} is being processed.`,
      type: "order_status",
    },
    shipped: {
      title: "Order Shipped!",
      message: trackingNumber 
        ? `Your order #${orderNumber} has been shipped! Tracking: ${trackingNumber}`
        : `Your order #${orderNumber} has been shipped!`,
      type: "order_shipped",
    },
    out_for_delivery: {
      title: "Out for Delivery",
      message: `Your order #${orderNumber} is out for delivery today!`,
      type: "order_status",
    },
    delivered: {
      title: "Order Delivered!",
      message: `Your order #${orderNumber} has been delivered. Enjoy!`,
      type: "order_delivered",
    },
    cancelled: {
      title: "Order Cancelled",
      message: `Your order #${orderNumber} has been cancelled.`,
      type: "order_cancelled",
    },
    refunded: {
      title: "Refund Processed",
      message: `Refund for order #${orderNumber} has been processed.`,
      type: "payment_refunded",
    },
  };

  const notification = statusMessages[status];
  if (!notification) return;

  await sendPushNotification({
    userId,
    title: notification.title,
    message: notification.message,
    type: notification.type,
    data: { orderId, orderNumber, status, ...(trackingNumber && { trackingNumber }) },
    url: `stb://orders/${orderId}`,
  });
}

/**
 * Send support ticket reply notification
 */
export async function sendTicketReplyNotification(
  userId: string,
  ticketNumber: string,
  ticketId: string,
  agentName: string
): Promise<void> {
  await sendPushNotification({
    userId,
    title: "New Reply on Your Ticket",
    message: `${agentName} replied to your ticket #${ticketNumber}`,
    type: "ticket_reply",
    data: { ticketId, ticketNumber },
    url: `stb://support/${ticketId}`,
  });
}

/**
 * Send ticket resolved notification
 */
export async function sendTicketResolvedNotification(
  userId: string,
  ticketNumber: string,
  ticketId: string
): Promise<void> {
  await sendPushNotification({
    userId,
    title: "Ticket Resolved",
    message: `Your support ticket #${ticketNumber} has been resolved.`,
    type: "ticket_resolved",
    data: { ticketId, ticketNumber },
    url: `stb://support/${ticketId}`,
  });
}

/**
 * Send price drop notification for wishlist items
 */
export async function sendPriceDropNotification(
  userId: string,
  productName: string,
  productId: string,
  oldPrice: number,
  newPrice: number
): Promise<void> {
  const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  await sendPushNotification({
    userId,
    title: "Price Drop Alert!",
    message: `${productName} is now ${discount}% off! Was ₹${oldPrice.toLocaleString("en-IN")}, now ₹${newPrice.toLocaleString("en-IN")}`,
    type: "price_drop",
    data: { productId, oldPrice: String(oldPrice), newPrice: String(newPrice) },
    url: `stb://product/${productId}`,
  });
}

/**
 * Send promotional notification to all users
 */
export async function sendPromotionalNotification(
  userIds: string[],
  title: string,
  message: string,
  url?: string,
  imageUrl?: string
): Promise<{ sent: number; failed: number }> {
  const result = await sendBulkPushNotification({
    userIds,
    title,
    message,
    type: "promotion",
    url,
    imageUrl,
  });
  return { sent: result.sent, failed: result.failed };
}
