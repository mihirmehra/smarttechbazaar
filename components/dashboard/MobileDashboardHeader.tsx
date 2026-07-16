"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronLeft, Bell } from "lucide-react";
import { useEffect, useState } from "react";

const pageTitles: Record<string, string> = {
  "/dashboard": "My Account",
  "/dashboard/orders": "My Orders",
  "/dashboard/addresses": "Saved Addresses",
  "/dashboard/wishlist": "Wishlist",
  "/dashboard/notifications": "Notifications",
  "/dashboard/support": "Support",
  "/dashboard/support/new": "New Ticket",
  "/dashboard/profile": "Profile",
  "/dashboard/security": "Security",
  "/dashboard/delete-account": "Delete Account",
};

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/dashboard/orders/")) return "Order Details";
  if (pathname.startsWith("/dashboard/support/") && pathname !== "/dashboard/support") return "Ticket Details";
  return "My Account";
}

function getBackHref(pathname: string): string | null {
  if (pathname === "/dashboard") return null;
  if (pathname.startsWith("/dashboard/orders/") && pathname !== "/dashboard/orders") return "/dashboard/orders";
  if (pathname.startsWith("/dashboard/support/new")) return "/dashboard/support";
  if (pathname.startsWith("/dashboard/support/") && pathname !== "/dashboard/support") return "/dashboard/support";
  if (pathname === "/dashboard/delete-account") return "/dashboard/security";
  return "/dashboard";
}

export default function MobileDashboardHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  const title = getTitle(pathname);
  const backHref = getBackHref(pathname);
  const isRoot = pathname === "/dashboard";

  useEffect(() => {
    fetch("/api/user/notifications?unreadOnly=true")
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {});
  }, [pathname]);

  const initials = session?.user?.name
    ? session.user.name
        .split(" ")
        .slice(0, 2)
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : "U";

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-white px-4 md:hidden">
      {/* Left: back button or avatar */}
      <div className="flex w-10 items-center">
        {backHref ? (
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted press-active"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 stroke-[2.5]" />
          </button>
        ) : (
          <Link
            href="/dashboard/profile"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-white ring-2 ring-primary/20 press-active"
            aria-label="Go to profile"
          >
            {initials}
          </Link>
        )}
      </div>

      {/* Center: title */}
      <h1 className="text-sm font-bold text-foreground text-balance text-center">{title}</h1>

      {/* Right: notifications bell */}
      <div className="flex w-10 items-center justify-end">
        <Link
          href="/dashboard/notifications"
          className="relative flex h-9 w-9 items-center justify-center rounded-xl text-foreground transition-colors hover:bg-muted press-active"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold leading-none text-white ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
