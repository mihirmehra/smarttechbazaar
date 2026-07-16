import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://admin:pVFlUkFuz3ii80RB@stb.3d0fv9t.mongodb.net/sabkatechbazar";

// Define User Schema inline for script
const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String },
    name: { type: String, required: true },
    phone: { type: String },
    role: {
      type: String,
      enum: ["super_admin", "admin", "customer"],
      default: "customer",
    },
    isActive: { type: Boolean, default: true },
    avatar: { type: String },
    googleId: { type: String },
    addresses: [
      {
        name: String,
        phone: String,
        address: String,
        city: String,
        state: String,
        pincode: String,
        isDefault: Boolean,
      },
    ],
  },
  { timestamps: true }
);

async function seedSuperAdmin() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB");

    const User = mongoose.models.User || mongoose.model("User", UserSchema);

    // Check if super admin already exists
    const existingAdmin = await User.findOne({ role: "super_admin" });

    if (existingAdmin) {
      console.log("Super admin already exists:", existingAdmin.email);
      await mongoose.disconnect();
      return;
    }

    // Create super admin
    const hashedPassword = await bcrypt.hash("Admin@123", 12);

    const superAdmin = await User.create({
      email: "admin@sabkatechbazar.com",
      password: hashedPassword,
      name: "Super Admin",
      phone: "9876543210",
      role: "super_admin",
      isActive: true,
    });

    console.log("Super admin created successfully!");
    console.log("Email:", superAdmin.email);
    console.log("Password: Admin@123");
    console.log("Please change this password after first login!");

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB");
  } catch (error) {
    console.error("Error seeding super admin:", error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

seedSuperAdmin();
