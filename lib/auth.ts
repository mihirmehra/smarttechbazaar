import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import dbConnect from "./mongodb";
import User, { type UserRole } from "@/models/User";

// Normalize NEXTAUTH_URL before NextAuth reads it. A trailing slash (e.g.
// "https://smarttechbazaar.com/") produces malformed callback URLs with a double
// slash ("...com//api/auth/callback/..."), which breaks the sign-in callback and
// surfaces as an "unexpected error" after the provider returns. Strip it here so
// the value is always well-formed regardless of how it was entered.
if (process.env.NEXTAUTH_URL) {
  process.env.NEXTAUTH_URL = process.env.NEXTAUTH_URL.replace(/\/+$/, "");
}

declare module "next-auth" {
  interface User {
    id: string;
    role: UserRole;
    isEmailVerified: boolean;
    isOnboardingComplete: boolean;
    gstNumber?: string;
    isGstVerified: boolean;
  }
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      role: UserRole;
      image?: string;
      isEmailVerified: boolean;
      isOnboardingComplete: boolean;
      gstNumber?: string;
      isGstVerified: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: UserRole;
    isEmailVerified: boolean;
    isOnboardingComplete: boolean;
    gstNumber?: string;
    isGstVerified: boolean;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        await dbConnect();

        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        if (!user) {
          throw new Error("No user found with this email");
        }

        if (!user.password) {
          // User signed up with OAuth (Google or Apple)
          if (user.googleId) {
            throw new Error("Please sign in with Google");
          }
          if (user.appleId) {
            throw new Error("Please sign in with Apple");
          }
          throw new Error("Please sign in with your social account");
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isPasswordValid) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
          isEmailVerified: user.isEmailVerified || false,
          isOnboardingComplete: user.isOnboardingComplete || false,
          gstNumber: user.gstNumber,
          isGstVerified: user.isGstVerified || false,
        };
      },
    }),
    CredentialsProvider({
      id: "google-firebase",
      name: "Google",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
        googleId: { label: "Google ID", type: "text" },
        avatar: { label: "Avatar", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.googleId) {
          throw new Error("Google authentication failed");
        }

        await dbConnect();

        let user = await User.findOne({
          $or: [
            { googleId: credentials.googleId },
            { email: credentials.email.toLowerCase() },
          ],
        });

        if (!user) {
          // Create new customer account for Google sign-in
          // Google users are automatically email verified
          user = await User.create({
            email: credentials.email.toLowerCase(),
            name: credentials.name || credentials.email.split("@")[0],
            googleId: credentials.googleId,
            avatar: credentials.avatar,
            role: "customer",
            isActive: true,
            isEmailVerified: true, // Google email is already verified
            isOnboardingComplete: false,
            isGstVerified: false,
          });
        } else if (!user.googleId) {
          // Link Google account to existing email account
          user.googleId = credentials.googleId;
          if (credentials.avatar && !user.avatar) {
            user.avatar = credentials.avatar;
          }
          await user.save();
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        // Only customers can use Google sign-in
        if (user.role !== "customer") {
          throw new Error("Admins must use email/password to sign in");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
          isEmailVerified: user.isEmailVerified || false,
          isOnboardingComplete: user.isOnboardingComplete || false,
          gstNumber: user.gstNumber,
          isGstVerified: user.isGstVerified || false,
        };
      },
    }),
    // Sign in with Apple - Required for iOS App Store compliance (Guideline 4.8)
    CredentialsProvider({
      id: "apple",
      name: "Apple",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
        appleId: { label: "Apple ID", type: "text" },
        identityToken: { label: "Identity Token", type: "text" },
      },
      async authorize(credentials) {
        if (!credentials?.appleId) {
          throw new Error("Apple authentication failed");
        }

        await dbConnect();

        // First, try to find user by appleId (for returning users)
        let user = await User.findOne({ appleId: credentials.appleId });

        // If not found by appleId but email is provided, try to find by email
        // This handles the case where user exists but hasn't linked Apple yet
        if (!user && credentials.email) {
          user = await User.findOne({ email: credentials.email.toLowerCase() });
          
          if (user) {
            // Link Apple account to existing email account
            user.appleId = credentials.appleId;
            await user.save();
          }
        }

        if (!user) {
          // New user - we need email to create account
          if (!credentials.email) {
            // Apple hides email on subsequent sign-ins
            // This shouldn't happen for truly new users, but handle gracefully
            throw new Error("Could not retrieve email from Apple. Please try again or use another sign-in method.");
          }

          // Create new customer account for Apple sign-in
          // Apple users are automatically email verified
          user = await User.create({
            email: credentials.email.toLowerCase(),
            name: credentials.name || credentials.email.split("@")[0],
            appleId: credentials.appleId,
            role: "customer",
            isActive: true,
            isEmailVerified: true, // Apple email is already verified
            isOnboardingComplete: false,
            isGstVerified: false,
          });
        }

        if (!user.isActive) {
          throw new Error("Your account has been deactivated");
        }

        // Only customers can use Apple sign-in
        if (user.role !== "customer") {
          throw new Error("Admins must use email/password to sign in");
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
          isEmailVerified: user.isEmailVerified || false,
          isOnboardingComplete: user.isOnboardingComplete || false,
          gstNumber: user.gstNumber,
          isGstVerified: user.isGstVerified || false,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/error",
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.isEmailVerified = user.isEmailVerified;
        token.isOnboardingComplete = user.isOnboardingComplete;
        token.gstNumber = user.gstNumber;
        token.isGstVerified = user.isGstVerified;
      }
      // Refresh user data on update trigger
      if (trigger === "update") {
        await dbConnect();
        const freshUser = await User.findById(token.id);
        if (freshUser) {
          token.isEmailVerified = freshUser.isEmailVerified || false;
          token.isOnboardingComplete = freshUser.isOnboardingComplete || false;
          token.gstNumber = freshUser.gstNumber;
          token.isGstVerified = freshUser.isGstVerified || false;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.isEmailVerified = token.isEmailVerified;
        session.user.isOnboardingComplete = token.isOnboardingComplete;
        session.user.gstNumber = token.gstNumber;
        session.user.isGstVerified = token.isGstVerified;
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
};
