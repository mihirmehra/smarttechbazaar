import dbConnect from "./mongodb";
import Notification, { NotificationType } from "@/models/Notification";
import User from "@/models/User";

interface CreateNotificationOptions {
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  metadata?: Record<string, unknown>;
  notifyAdmins?: boolean;
}

/**
 * Creates a notification for a specific user or all admins
 */
export async function createNotification({
  userId,
  type,
  title,
  message,
  link,
  metadata,
  notifyAdmins = false,
}: CreateNotificationOptions): Promise<void> {
  try {
    await dbConnect();

    if (notifyAdmins) {
      // Get all admin users
      const admins = await User.find({ 
        role: { $in: ["admin", "super_admin"] },
        isActive: true 
      }).select("_id");

      // Create notifications for all admins
      const notifications = admins.map((admin) => ({
        user: admin._id,
        type,
        title,
        message,
        link,
        metadata,
        isRead: false,
      }));

      if (notifications.length > 0) {
        await Notification.insertMany(notifications);
      }
    } else if (userId) {
      await Notification.create({
        user: userId,
        type,
        title,
        message,
        link,
        metadata,
        isRead: false,
      });
    }
  } catch (error) {
    console.error("Error creating notification:", error);
  }
}

/**
 * Notify admins about a new order
 */
export async function notifyNewOrder(
  orderNumber: string,
  orderId: string,
  customerName: string,
  total: number
): Promise<void> {
  await createNotification({
    notifyAdmins: true,
    type: "order",
    title: "New Order Received",
    message: `Order #${orderNumber} placed by ${customerName} for Rs ${total.toLocaleString("en-IN")}`,
    link: `/admin/orders/${orderId}`,
    metadata: { orderId, orderNumber, total },
  });
}

/**
 * Notify admins about order status change
 */
export async function notifyOrderStatusChange(
  orderNumber: string,
  orderId: string,
  newStatus: string
): Promise<void> {
  await createNotification({
    notifyAdmins: true,
    type: "order",
    title: "Order Status Updated",
    message: `Order #${orderNumber} status changed to ${newStatus}`,
    link: `/admin/orders/${orderId}`,
    metadata: { orderId, orderNumber, status: newStatus },
  });
}

/**
 * Notify admins about a new support ticket
 */
export async function notifyNewTicket(
  ticketNumber: string,
  ticketId: string,
  subject: string,
  customerName: string
): Promise<void> {
  await createNotification({
    notifyAdmins: true,
    type: "ticket",
    title: "New Support Ticket",
    message: `${customerName} opened ticket #${ticketNumber}: ${subject}`,
    link: `/admin/tickets/${ticketId}`,
    metadata: { ticketId, ticketNumber },
  });
}

/**
 * Notify admins about low stock
 */
export async function notifyLowStock(
  productName: string,
  productId: string,
  currentStock: number
): Promise<void> {
  await createNotification({
    notifyAdmins: true,
    type: "inventory",
    title: "Low Stock Alert",
    message: `${productName} is running low (${currentStock} remaining)`,
    link: `/admin/inventory/${productId}`,
    metadata: { productId, currentStock },
  });
}

/**
 * Notify customer about their order
 */
export async function notifyCustomerOrderUpdate(
  userId: string,
  orderNumber: string,
  orderId: string,
  status: string
): Promise<void> {
  const statusMessages: Record<string, string> = {
    confirmed: "Your order has been confirmed and is being processed",
    processing: "Your order is being prepared for shipping",
    shipped: "Your order has been shipped and is on its way",
    delivered: "Your order has been delivered",
    cancelled: "Your order has been cancelled",
  };

  await createNotification({
    userId,
    type: "order",
    title: `Order ${status.charAt(0).toUpperCase() + status.slice(1)}`,
    message: statusMessages[status] || `Order #${orderNumber} status: ${status}`,
    link: `/dashboard/orders/${orderId}`,
    metadata: { orderId, orderNumber, status },
  });
}

/**
 * Notify customer about ticket reply
 */
export async function notifyTicketReply(
  userId: string,
  ticketNumber: string,
  ticketId: string,
  replierName: string
): Promise<void> {
  await createNotification({
    userId,
    type: "ticket",
    title: "New Ticket Reply",
    message: `${replierName} replied to ticket #${ticketNumber}`,
    link: `/dashboard/support/${ticketId}`,
    metadata: { ticketId, ticketNumber },
  });
}

/**
 * Notify customer about payment status
 */
export async function notifyPaymentStatus(
  userId: string,
  orderNumber: string,
  orderId: string,
  status: "paid" | "failed" | "refunded"
): Promise<void> {
  const messages: Record<string, { title: string; message: string }> = {
    paid: {
      title: "Payment Successful",
      message: `Payment received for order #${orderNumber}`,
    },
    failed: {
      title: "Payment Failed",
      message: `Payment failed for order #${orderNumber}. Please try again.`,
    },
    refunded: {
      title: "Refund Processed",
      message: `Refund has been processed for order #${orderNumber}`,
    },
  };

  await createNotification({
    userId,
    type: "payment",
    title: messages[status].title,
    message: messages[status].message,
    link: `/dashboard/orders/${orderId}`,
    metadata: { orderId, orderNumber, paymentStatus: status },
  });
}
