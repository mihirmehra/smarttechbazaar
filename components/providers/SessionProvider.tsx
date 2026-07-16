"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { ReactNode } from "react";
import { CartWishlistProvider } from "./CartWishlistProvider";

export default function SessionProvider({ children }: { children: ReactNode }) {
  return (
    <NextAuthSessionProvider>
      <CartWishlistProvider>{children}</CartWishlistProvider>
    </NextAuthSessionProvider>
  );
}
