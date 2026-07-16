import mongoose, { Schema, Document, Model } from "mongoose";

export type TicketStatus = "open" | "in_progress" | "waiting" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "order" | "product" | "payment" | "shipping" | "refund" | "account" | "other";

export interface ITicketReply {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  userName: string;
  userRole: "customer" | "admin" | "super_admin";
  message: string;
  attachments: string[];
  isInternal: boolean;
  createdAt: Date;
}

export interface ITicket extends Document {
  _id: mongoose.Types.ObjectId;
  ticketNumber: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  user: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  order?: mongoose.Types.ObjectId;
  replies: ITicketReply[];
  attachments: string[];
  tags: string[];
  isEscalated: boolean;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TicketReplySchema = new Schema<ITicketReply>(
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
    message: {
      type: String,
      required: true,
    },
    attachments: [{
      type: String,
    }],
    isInternal: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

const TicketSchema = new Schema<ITicket>(
  {
    ticketNumber: {
      type: String,
      required: true,
      unique: true,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      enum: ["order", "product", "payment", "shipping", "refund", "account", "other"],
      default: "other",
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "waiting", "resolved", "closed"],
      default: "open",
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    replies: [TicketReplySchema],
    attachments: [{
      type: String,
    }],
    tags: [{
      type: String,
      lowercase: true,
      trim: true,
    }],
    isEscalated: {
      type: Boolean,
      default: false,
    },
    firstResponseAt: Date,
    resolvedAt: Date,
    closedAt: Date,
  },
  {
    timestamps: true,
  }
);

// Create indexes
// Note: ticketNumber index is created automatically via unique: true in the schema field definition
TicketSchema.index({ user: 1 });
TicketSchema.index({ assignedTo: 1 });
TicketSchema.index({ status: 1 });
TicketSchema.index({ priority: 1 });
TicketSchema.index({ category: 1 });
TicketSchema.index({ createdAt: -1 });
TicketSchema.index({ subject: "text", description: "text" });

// Generate ticket number before saving
TicketSchema.pre("save", async function (next) {
  if (this.isNew && !this.ticketNumber) {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    this.ticketNumber = `TKT${year}${month}${random}`;
  }
  next();
});

const Ticket: Model<ITicket> =
  mongoose.models.Ticket || mongoose.model<ITicket>("Ticket", TicketSchema);

export default Ticket;
