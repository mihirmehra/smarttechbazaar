"use client";

import { signOut as nextAuthSignOut } from "next-auth/react";
import { isMedianApp, nativeSocialLogout } from "@/lib/native-app";

/**
 * Enhanced sign out that handles both NextAuth session cleanup
 * and native social login logout when running in Median.co app
 */
export async function signOutWithNativeCleanup(options?: {
  callbackUrl?: string;
  redirect?: boolean;
}) {
  // If in native app, also logout from native social providers
  if (isMedianApp()) {
    try {
      nativeSocialLogout();
    } catch (error) {
      console.error("Native social logout failed:", error);
      // Continue with NextAuth signout even if native logout fails
    }
  }

  // Sign out from NextAuth
  return nextAuthSignOut(options);
}
