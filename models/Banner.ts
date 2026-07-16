import mongoose, { Schema, Document, Model } from "mongoose";

export type BannerPosition = "hero" | "promo" | "sidebar" | "footer" | "hero_slider" | "ad_banner";

export interface IBanner extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  subtitle?: string;
  image: string;
  imageMobile?: string;
  link?: string;
  position: BannerPosition;
  isActive: boolean;
  sortOrder: number;
  startDate?: Date;
  endDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const BannerSchema = new Schema<IBanner>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    subtitle: {
      type: String,
      trim: true,
    },
    image: {
      type: String,
      required: true,
    },
    imageMobile: {
      type: String,
    },
    link: {
      type: String,
      trim: true,
    },
    position: {
      type: String,
      enum: ["hero", "promo", "sidebar", "footer", "hero_slider", "ad_banner"],
      default: "hero",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
    startDate: Date,
    endDate: Date,
  },
  {
    timestamps: true,
  }
);

// Create indexes
BannerSchema.index({ position: 1 });
BannerSchema.index({ isActive: 1 });
BannerSchema.index({ sortOrder: 1 });
BannerSchema.index({ position: 1, isActive: 1, sortOrder: 1 }); // Compound index for banner queries

const Banner: Model<IBanner> =
  mongoose.models.Banner || mongoose.model<IBanner>("Banner", BannerSchema);

export default Banner;
