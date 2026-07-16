import mongoose, { Schema, Document, Model } from "mongoose";

export type ActivityType = 
  | "login"
  | "logout"
  | "password_change"
  | "password_reset"
  | "profile_update"
  | "order_placed"
  | "order_cancelled"
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "category_created"
  | "category_updated"
  | "category_deleted"
  | "brand_created"
  | "brand_updated"
  | "brand_deleted"
  | "user_created"
  | "user_updated"
  | "user_deleted"
  | "ticket_created"
  | "ticket_updated"
  | "inventory_adjusted"
  | "settings_updated"
  | "other";

export interface IActivityLog extends Document {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  userName: string;
  userRole: "customer" | "admin" | "super_admin";
  activityType: ActivityType;
  description: string;
  entityType?: string;
  entityId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      enum: ["customer", "admin", "super_admin"],
      required: true,
    },
    activityType: {
      type: String,
      enum: [
        "login",
        "logout",
        "password_change",
        "password_reset",
        "profile_update",
        "order_placed",
        "order_cancelled",
        "product_created",
        "product_updated",
        "product_deleted",
        "category_created",
        "category_updated",
        "category_deleted",
        "brand_created",
        "brand_updated",
        "brand_deleted",
        "user_created",
        "user_updated",
        "user_deleted",
        "ticket_created",
        "ticket_updated",
        "inventory_adjusted",
        "settings_updated",
        "other",
      ],
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    entityType: {
      type: String,
    },
    entityId: {
      type: Schema.Types.ObjectId,
    },
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Create indexes
ActivityLogSchema.index({ user: 1 });
ActivityLogSchema.index({ activityType: 1 });
ActivityLogSchema.index({ entityType: 1, entityId: 1 });
ActivityLogSchema.index({ createdAt: -1 });

const ActivityLog: Model<IActivityLog> =
  mongoose.models.ActivityLog || mongoose.model<IActivityLog>("ActivityLog", ActivityLogSchema);

export default ActivityLog;
