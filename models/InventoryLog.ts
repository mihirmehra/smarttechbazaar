import mongoose, { Schema, Document, Model } from "mongoose";

export type InventoryActionType = 
  | "purchase"
  | "sale"
  | "adjustment"
  | "return"
  | "damage"
  | "transfer"
  | "initial";

export interface IInventoryLog extends Document {
  _id: mongoose.Types.ObjectId;
  product: mongoose.Types.ObjectId;
  productName: string;
  productSku: string;
  actionType: InventoryActionType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  reason?: string;
  reference?: string;
  order?: mongoose.Types.ObjectId;
  performedBy: mongoose.Types.ObjectId;
  performedByName: string;
  createdAt: Date;
}

const InventoryLogSchema = new Schema<IInventoryLog>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    productSku: {
      type: String,
      required: true,
    },
    actionType: {
      type: String,
      enum: ["purchase", "sale", "adjustment", "return", "damage", "transfer", "initial"],
      required: true,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    previousStock: {
      type: Number,
      required: true,
    },
    newStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      trim: true,
    },
    reference: {
      type: String,
      trim: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
    },
    performedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    performedByName: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Create indexes
InventoryLogSchema.index({ product: 1 });
InventoryLogSchema.index({ actionType: 1 });
InventoryLogSchema.index({ performedBy: 1 });
InventoryLogSchema.index({ createdAt: -1 });
InventoryLogSchema.index({ order: 1 });

const InventoryLog: Model<IInventoryLog> =
  mongoose.models.InventoryLog || mongoose.model<IInventoryLog>("InventoryLog", InventoryLogSchema);

export default InventoryLog;
