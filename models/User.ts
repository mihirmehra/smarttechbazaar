import mongoose, { Schema, Document, Model } from "mongoose";

export type UserRole = "super_admin" | "admin" | "customer";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  phone?: string;
  role: UserRole;
  isActive: boolean;
  avatar?: string;
  googleId?: string;
  appleId?: string;
  lastLoginAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  // Email verification fields
  isEmailVerified: boolean;
  emailVerificationCode?: string;
  emailVerificationExpires?: Date;
  // GST & Onboarding fields
  gstNumber?: string;
  isGstVerified: boolean;
  isOnboardingComplete: boolean;
  businessName?: string;
  businessType?: "retailer" | "wholesaler" | "distributor" | "manufacturer" | "other";
  gstVerifiedData?: {
    legalName?: string;
    tradeName?: string;
    state?: string;
    stateCode?: string;
    registrationDate?: string;
    constitutionOfBusiness?: string;
    taxpayerType?: string;
    status?: string;
    verifiedAt?: Date;
  };
  // GST OTP verification tracking
  isGstOtpVerified?: boolean;
  gstVerificationMethod?: "otp" | "manual" | "public_api";
  gstOtpRequest?: {
    gstin: string;
    username: string;
    requestedAt: Date;
    attempts: number;
  };
  addresses: {
    _id: mongoose.Types.ObjectId;
    name: string;
    phone: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    isDefault: boolean;
  }[];
  // Notification preferences (for app store compliance)
  notificationPreferences?: {
    orderUpdates: boolean;
    promotions: boolean;
    priceDrops: boolean;
    supportMessages: boolean;
    announcements: boolean;
  };
  // Push notification devices
  pushDevices?: {
    token: string;
    platform: "ios" | "android" | "web" | "app";
    registeredAt: Date;
  }[];
  createdAt: Date;
  updatedAt: Date;
}

const AddressSchema = new Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  city: { type: String, required: true },
  state: { type: String, required: true },
  pincode: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
});

const NotificationPreferencesSchema = new Schema({
  orderUpdates: { type: Boolean, default: true },
  promotions: { type: Boolean, default: true },
  priceDrops: { type: Boolean, default: true },
  supportMessages: { type: Boolean, default: true },
  announcements: { type: Boolean, default: true },
}, { _id: false });

const PushDeviceSchema = new Schema({
  token: { type: String, required: true },
  platform: { type: String, enum: ["ios", "android", "web", "app"], default: "web" },
  registeredAt: { type: Date, default: Date.now },
});

const GstVerifiedDataSchema = new Schema({
  legalName: { type: String },
  tradeName: { type: String },
  state: { type: String },
  stateCode: { type: String },
  registrationDate: { type: String },
  constitutionOfBusiness: { type: String },
  taxpayerType: { type: String },
  status: { type: String },
  verifiedAt: { type: Date },
}, { _id: false });

const GstOtpRequestSchema = new Schema({
  gstin: { type: String, required: true },
  username: { type: String, required: true },
  requestedAt: { type: Date, default: Date.now },
  attempts: { type: Number, default: 0 },
}, { _id: false });

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: function (this: IUser) {
        // Password is NOT required for OAuth users (Google or Apple sign-in)
        return !this.googleId && !this.appleId;
      },
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["super_admin", "admin", "customer"],
      default: "customer",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    avatar: {
      type: String,
    },
    googleId: {
      type: String,
      sparse: true,
    },
    appleId: {
      type: String,
      sparse: true,
    },
    lastLoginAt: {
      type: Date,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationCode: {
      type: String,
    },
    emailVerificationExpires: {
      type: Date,
    },
    // GST & Onboarding
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    isGstVerified: {
      type: Boolean,
      default: false,
    },
    isOnboardingComplete: {
      type: Boolean,
      default: false,
    },
    businessName: {
      type: String,
      trim: true,
    },
    businessType: {
      type: String,
      enum: ["retailer", "wholesaler", "distributor", "manufacturer", "other"],
    },
    gstVerifiedData: {
      type: GstVerifiedDataSchema,
    },
    // GST OTP verification
    isGstOtpVerified: {
      type: Boolean,
      default: false,
    },
    gstVerificationMethod: {
      type: String,
      enum: ["otp", "manual", "public_api"],
    },
    gstOtpRequest: {
      type: GstOtpRequestSchema,
    },
    addresses: [AddressSchema],
    // Notification preferences for app store compliance
    notificationPreferences: {
      type: NotificationPreferencesSchema,
      default: () => ({
        orderUpdates: true,
        promotions: true,
        priceDrops: true,
        supportMessages: true,
        announcements: true,
      }),
    },
    // Push notification devices
    pushDevices: [PushDeviceSchema],
  },
  {
    timestamps: true,
  }
);

// Create indexes
UserSchema.index({ role: 1 });
UserSchema.index({ role: 1, createdAt: -1 }); // For customer listing with pagination
UserSchema.index({ name: "text", email: "text", phone: "text" }); // For search
// Note: email and googleId indexes are created automatically via unique: true / sparse: true in the schema field definitions

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
