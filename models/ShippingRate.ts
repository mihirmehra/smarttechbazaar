import mongoose, { Schema, Document, Model } from "mongoose";

export interface IShippingRate extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  state: string;
  city?: string;
  pincode?: string;
  rate: number;
  freeAbove?: number;
  estimatedDays: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ShippingRateSchema = new Schema<IShippingRate>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    city: {
      type: String,
      trim: true,
    },
    pincode: {
      type: String,
      trim: true,
    },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    freeAbove: {
      type: Number,
      min: 0,
    },
    estimatedDays: {
      type: Number,
      required: true,
      default: 5,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
ShippingRateSchema.index({ state: 1 });
ShippingRateSchema.index({ city: 1 });
ShippingRateSchema.index({ pincode: 1 });
ShippingRateSchema.index({ isActive: 1 });

const ShippingRate: Model<IShippingRate> =
  mongoose.models.ShippingRate ||
  mongoose.model<IShippingRate>("ShippingRate", ShippingRateSchema);

export default ShippingRate;
