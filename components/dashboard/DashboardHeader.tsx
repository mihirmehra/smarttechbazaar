"use client";

import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutWithNativeCleanup } from "@/lib/auth-helpers";
import { LogOut, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const pageTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/orders": "My Orders",
  "/dashboard/addresses": "Saved Addresses",
  "/dashboard/wishlist": "Wishlist",
  "/dashboard/support": "Support Tickets",
  "/dashboard/support/new": "New Ticket",
  "/dashboard/profile": "Profile Settings",
  "/dashboard/security": "Security",
};

function getTitle(pathname: string): string {
  if (pageTitles[pathname]) return pageTitles[pathname];
  if (pathname.startsWith("/dashboard/orders/")) return "Order Detail";
  if (pathname.startsWith("/dashboard/support/")) return "Ticket Detail";
  return "Dashboard";
}

function getBreadcrumb(pathname: string): { label: string; href?: string }[] {
  const base = [{ label: "Dashboard", href: "/dashboard" }];
  if (pathname === "/dashboard") return [{ label: "Overview" }];
  if (pathname.startsWith("/dashboard/orders/") && pathname !== "/dashboard/orders") {
    return [...base, { label: "My Orders", href: "/dashboard/orders" }, { label: "Order Detail" }];
  }
  if (pathname.startsWith("/dashboard/support/new")) {
    return [...base, { label: "Support", href: "/dashboard/support" }, { label: "New Ticket" }];
  }
  if (pathname.startsWith("/dashboard/support/") && pathname !== "/dashboard/support") {
    return [...base, { label: "Support", href: "/dashboard/support" }, { label: "Ticket Detail" }];
  }
  const title = getTitle(pathname);
  return [...base, { label: title }];
}

export default function DashboardHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const breadcrumbs = getBreadcrumb(pathname);
  const title = getTitle(pathname);

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-6">
      <div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3" />}
              {crumb.href ? (
                <a href={crumb.href} className="hover:text-foreground transition-colors">
                  {crumb.label}
                </a>
              ) : (
                <span className="text-foreground font-medium">{crumb.label}</span>
              )}
            </span>
          ))}
        </div>
        <h1 className="font-heading text-xl font-bold text-foreground leading-tight">{title}</h1>
      </div>

      <div className="flex items-center gap-3">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-foreground leading-tight">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground">{session?.user?.email}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => signOutWithNativeCleanup({ callbackUrl: "/" })}
          className="gap-2"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Sign out</span>
        </Button>
      </div>
    </header>
  );
}
