import mongoose, { Schema, Document, Model } from "mongoose";

export type CouponType = "percentage" | "fixed";

export interface ICoupon extends Document {
  _id: mongoose.Types.ObjectId;
  code: string;
  description?: string;
  type: CouponType;
  value: number; // Percentage (0-100) or fixed amount
  minOrderValue: number;
  maxDiscount?: number; // Cap for percentage discounts
  usageLimit?: number; // Total times this coupon can be used
  usageCount: number; // How many times it has been used
  userUsageLimit?: number; // Max uses per user
  validFrom: Date;
  validUntil: Date;
  isActive: boolean;
  applicableCategories?: mongoose.Types.ObjectId[]; // If empty, applies to all
  applicableProducts?: mongoose.Types.ObjectId[]; // If empty, applies to all
  excludedProducts?: mongoose.Types.ObjectId[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: 20,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    type: {
      type: String,
      enum: ["percentage", "fixed"],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    usageLimit: {
      type: Number,
      min: 1,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    userUsageLimit: {
      type: Number,
      default: 1,
      min: 1,
    },
    validFrom: {
      type: Date,
      required: true,
    },
    validUntil: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: "Category",
      },
    ],
    applicableProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    excludedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Create indexes
// Note: code index is created automatically via unique: true in the schema field definition
CouponSchema.index({ isActive: 1, validFrom: 1, validUntil: 1 });

// Virtual to check if coupon is currently valid
CouponSchema.virtual("isValid").get(function (this: ICoupon) {
  const now = new Date();
  return (
    this.isActive &&
    now >= this.validFrom &&
    now <= this.validUntil &&
    (this.usageLimit === undefined || this.usageCount < this.usageLimit)
  );
});

const Coupon: Model<ICoupon> =
  mongoose.models.Coupon || mongoose.model<ICoupon>("Coupon", CouponSchema);

export default Coupon;
