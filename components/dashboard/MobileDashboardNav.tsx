"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { signOutWithNativeCleanup } from "@/lib/auth-helpers";
import { useCart, useWishlist } from "@/components/providers/CartWishlistProvider";
import {
  LayoutDashboard,
  ShoppingBag,
  Heart,
  Bell,
  Menu,
  MapPin,
  LifeBuoy,
  User,
  Shield,
  Store,
  LogOut,
  ShoppingCart,
  ChevronRight,
  X,
  Package,
  Headphones,
  Trash2,
} from "lucide-react";
import { useState } from "react";

const primaryTabs = [
  { title: "Home",    href: "/dashboard",               icon: LayoutDashboard, exact: true },
  { title: "Orders",  href: "/dashboard/orders",         icon: ShoppingBag,     exact: false },
  { title: "Wishlist",href: "/dashboard/wishlist",       icon: Heart,           exact: false },
  { title: "Alerts",  href: "/dashboard/notifications",  icon: Bell,            exact: false },
];

type DrawerSection = {
  title: string;
  items: { title: string; href: string; icon: React.ComponentType<{ className?: string }>; color: string; badge?: number }[];
};

export default function MobileDashboardNav() {
  const pathname  = usePathname();
  const { data: session } = useSession();
  const { cartCount }     = useCart();
  const { wishlistCount } = useWishlist();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isActive = (href: string, exact: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const initials = session?.user?.name
    ? session.user.name.split(" ").slice(0, 2).map((n: string) => n[0]).join("").toUpperCase()
    : "U";

  const drawerSections: DrawerSection[] = [
    {
      title: "My Account",
      items: [
        { title: "Overview",      href: "/dashboard",               icon: LayoutDashboard, color: "bg-stb-red-light text-primary" },
        { title: "My Orders",     href: "/dashboard/orders",        icon: Package,         color: "bg-blue-50 text-blue-600" },
        { title: "Wishlist",      href: "/dashboard/wishlist",      icon: Heart,           color: "bg-pink-50 text-pink-600",   badge: wishlistCount },
        { title: "Notifications", href: "/dashboard/notifications", icon: Bell,            color: "bg-amber-50 text-amber-600" },
      ],
    },
    {
      title: "Settings",
      items: [
        { title: "Profile",    href: "/dashboard/profile",         icon: User,      color: "bg-indigo-50 text-indigo-600" },
        { title: "Addresses",  href: "/dashboard/addresses",        icon: MapPin,    color: "bg-purple-50 text-purple-600" },
        { title: "Security",   href: "/dashboard/security",         icon: Shield,    color: "bg-green-50 text-green-600" },
        { title: "Support",    href: "/dashboard/support",          icon: Headphones, color: "bg-orange-50 text-orange-600" },
        { title: "Delete Account", href: "/dashboard/delete-account", icon: Trash2, color: "bg-red-50 text-destructive" },
      ],
    },
    {
      title: "Shopping",
      items: [
        { title: "Cart",       href: "/cart",      icon: ShoppingCart, color: "bg-emerald-50 text-emerald-600", badge: cartCount },
        { title: "Browse",     href: "/",          icon: Store,        color: "bg-slate-100 text-slate-600" },
        { title: "Help",       href: "/dashboard/support", icon: LifeBuoy, color: "bg-cyan-50 text-cyan-600" },
      ],
    },
  ];

  return (
    <>
      {/* ── Fixed bottom tab bar ─────────────────────────────────────── */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid h-16 grid-cols-5">
          {primaryTabs.map((tab) => {
            const active = isActive(tab.href, tab.exact);
            const isBell = tab.href === "/dashboard/notifications";

            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setDrawerOpen(false)}
                className="relative flex flex-col items-center justify-center gap-1 press-active"
                aria-label={tab.title}
              >
                {active && (
                  <span className="absolute top-2 h-8 w-12 rounded-full bg-stb-red-light" />
                )}
                <div className="relative z-10">
                  <tab.icon
                    className={`h-[22px] w-[22px] transition-all duration-200 ${
                      active ? "text-primary stroke-[2.5]" : "text-[#9CA3AF] stroke-[1.5]"
                    }`}
                  />
                  {/* Wishlist badge */}
                  {tab.href === "/dashboard/wishlist" && wishlistCount > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold leading-none text-white ring-1 ring-white">
                      {wishlistCount > 9 ? "9+" : wishlistCount}
                    </span>
                  )}
                  {/* Bell badge — no number, just a dot */}
                  {isBell && (
                    <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full border-2 border-white bg-primary" />
                  )}
                </div>
                <span
                  className={`relative z-10 text-[10px] font-semibold leading-none ${
                    active ? "text-primary" : "text-[#9CA3AF]"
                  }`}
                >
                  {tab.title}
                </span>
              </Link>
            );
          })}

          {/* Menu / drawer toggle */}
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            className="relative flex flex-col items-center justify-center gap-1 press-active"
            aria-label="Open menu"
          >
            {drawerOpen && (
              <span className="absolute top-2 h-8 w-12 rounded-full bg-stb-red-light" />
            )}
            <div className="relative z-10 flex h-[22px] w-[22px] items-center justify-center">
              {drawerOpen ? (
                <X className={`h-5 w-5 transition-all text-primary stroke-[2.5]`} />
              ) : (
                <Menu className={`h-5 w-5 text-[#9CA3AF] stroke-[1.5]`} />
              )}
            </div>
            <span
              className={`relative z-10 text-[10px] font-semibold leading-none ${
                drawerOpen ? "text-primary" : "text-[#9CA3AF]"
              }`}
            >
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* ── Backdrop ─────────────────────────────────────────────────── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* ── Left Slide-in Drawer ─────────────────────────────────────── */}
      <aside
        className={`fixed bottom-0 left-0 top-0 z-50 flex w-[300px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:hidden ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Drawer header — user identity */}
        <div className="flex items-center gap-3 border-b border-border bg-primary px-5 py-5">
          {session?.user?.image ? (
            <Image
              src={session.user.image}
              alt={session.user.name ?? ""}
              width={44}
              height={44}
              className="h-11 w-11 rounded-full object-cover ring-2 ring-white/40"
              unoptimized
            />
          ) : (
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/20 text-sm font-bold text-white ring-2 ring-white/30">
              {initials}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">
              {session?.user?.name ?? "Guest"}
            </p>
            <p className="truncate text-[11px] text-white/70">
              {session?.user?.email ?? ""}
            </p>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 press-active"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Cart quick-access banner */}
        {cartCount > 0 && (
          <Link
            href="/cart"
            onClick={() => setDrawerOpen(false)}
            className="flex items-center justify-between bg-stb-red-light px-5 py-3 press-active"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingCart className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold text-primary">
                {cartCount} item{cartCount !== 1 ? "s" : ""} in cart
              </span>
            </div>
            <span className="flex items-center gap-1 text-xs font-bold text-primary">
              View <ChevronRight className="h-3.5 w-3.5" />
            </span>
          </Link>
        )}

        {/* Scrollable nav sections */}
        <nav className="flex-1 overflow-y-auto py-2">
          {drawerSections.map((section) => (
            <div key={section.title} className="mb-1">
              <p className="px-5 pb-1.5 pt-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {section.title}
              </p>
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`flex items-center gap-3.5 px-4 py-3 transition-colors press-active ${
                      active
                        ? "bg-stb-red-light"
                        : "hover:bg-muted/60"
                    }`}
                  >
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${item.color} ${active ? "ring-1 ring-primary/20" : ""}`}>
                      <item.icon className="h-4.5 w-4.5" />
                    </div>
                    <span
                      className={`flex-1 text-sm font-semibold ${
                        active ? "text-primary" : "text-foreground"
                      }`}
                    >
                      {item.title}
                    </span>
                    {/* Badge */}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
                        {item.badge > 99 ? "99+" : item.badge}
                      </span>
                    )}
                    {active && (
                      <ChevronRight className="h-4 w-4 text-primary/50" />
                    )}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sign out footer */}
        <div className="border-t border-border px-4 py-4" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom, 1rem))" }}>
          <button
            onClick={() => signOutWithNativeCleanup({ callbackUrl: "/" })}
            className="flex w-full items-center gap-3.5 rounded-xl px-3 py-3 text-sm font-semibold text-destructive hover:bg-red-50 press-active"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-red-50">
              <LogOut className="h-4 w-4 text-destructive" />
            </div>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
