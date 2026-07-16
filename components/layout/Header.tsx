"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { signOutWithNativeCleanup } from "@/lib/auth-helpers";
import { useCart, useWishlist } from "@/components/providers/CartWishlistProvider";
import { useRouter, usePathname } from "next/navigation";
import {
  Search,
  Heart,
  ShoppingCart,
  Menu,
  X,
  User,
  LogOut,
  Settings,
  Package,
  ChevronDown,
  Home,
  Grid3X3,
  Phone,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

const navCategories = [
  { name: "Desktop", slug: "desktop" },
  { name: "Laptops", slug: "laptops" },
  { name: "Storage", slug: "storage" },
  { name: "Display", slug: "display" },
  { name: "Peripherals", slug: "peripherals" },
  { name: "Printers & Scanners", slug: "printers-scanners" },
  { name: "Security", slug: "security" },
  { name: "Networking", slug: "networking" },
  { name: "Software", slug: "software" },
  { name: "Mobility", slug: "mobility" },
  { name: "Cables", slug: "cables" },
  { name: "Connectors & Converters", slug: "connectors-converters" },
  { name: "Accessories", slug: "accessories" },
  { name: "Refurbished Laptops", slug: "refurbished-laptops" },
];

const mobileNavItems = [
  { name: "Home", href: "/", icon: Home },
  { name: "Shop", href: "/products", icon: Grid3X3 },
  { name: "Wishlist", href: "/wishlist", icon: Heart },
  { name: "Cart", href: "/cart", icon: ShoppingCart },
  { name: "Account", href: "/dashboard", icon: User },
];

export default function Header() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const { cartCount } = useCart();
  const { wishlistCount } = useWishlist();
  const [searchQuery, setSearchQuery] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const isAdmin = session?.user?.role === "admin" || session?.user?.role === "super_admin";

  useEffect(() => {
    if (
      status === "authenticated" &&
      session?.user &&
      !session.user.isOnboardingComplete &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/auth/")
    ) {
      router.push("/auth/onboarding");
    }
  }, [status, session, router]);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClick = () => setShowUserMenu(false);
    if (showUserMenu) {
      document.addEventListener("click", handleClick);
      return () => document.removeEventListener("click", handleClick);
    }
  }, [showUserMenu]);

  return (
    <>
      <header className={`sticky top-0 z-50 w-full bg-white ${pathname.startsWith("/dashboard") ? "hidden md:block" : ""}`}>
        {/* Top utility bar - Desktop */}
        <div className="hidden border-b border-border bg-muted/50 md:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-1.5">
            <div className="flex items-center gap-4 text-[11px] text-foreground/70">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                +91 63636 77588
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                Bangalore
              </span>
            </div>
            <div className="flex items-center gap-3 text-[11px]">
              <span className="text-muted-foreground">|</span>
              {status === "loading" ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : session ? (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                    className="flex items-center gap-1.5 font-medium text-foreground transition-colors hover:text-primary"
                  >
                    <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                      {session.user?.name?.[0]?.toUpperCase()}
                    </div>
                    {session.user?.name?.split(" ")[0]}
                    <ChevronDown className="h-3 w-3" />
                  </button>
                  {showUserMenu && (
                    <div className="absolute right-0 top-full z-50 mt-2 w-44 rounded-lg bg-white py-1 shadow-lg ring-1 ring-border animate-fade-in">
                      <Link
                        href="/dashboard"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted"
                      >
                        <User className="h-3.5 w-3.5 text-muted-foreground" />
                        My Account
                      </Link>
                      <Link
                        href="/dashboard/orders"
                        className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted"
                      >
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        Orders
                      </Link>
                      {isAdmin && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-xs text-foreground hover:bg-muted"
                        >
                          <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                          Admin
                        </Link>
                      )}
                      <hr className="my-1 border-border" />
                      <button
                        onClick={() => signOutWithNativeCleanup({ callbackUrl: "/" })}
                        className="flex w-full items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-muted"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link href="/auth/login" className="text-foreground hover:text-primary transition-colors">
                    Sign In
                  </Link>
                  <span className="text-border">|</span>
                  <Link href="/auth/register" className="font-semibold text-stb-red-dark transition-colors hover:text-primary">
                    Register
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main header */}
        <div className="border-b border-border">
          <div className="mx-auto flex max-w-7xl items-center gap-3 px-3 py-2 md:gap-6 md:px-4 md:py-3">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open navigation menu" className="h-11 w-11 shrink-0 rounded-xl md:hidden">
                  <Menu className="h-5 w-5" aria-hidden="true" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[280px] p-0">
                <SheetHeader className="border-b border-border p-4">
                  <SheetTitle className="flex items-center gap-2 text-left">
                    <Image src="/logo.png" alt="Smart Tech Bazaar" width={80} height={32} className="h-8 w-auto object-contain" />
                  </SheetTitle>
                </SheetHeader>

                {/* User info in drawer */}
                {session ? (
                  <div className="border-b border-border bg-muted/30 px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
                        {session.user?.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">{session.user?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{session.user?.email}</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="border-b border-border px-4 py-3">
                    <div className="flex gap-2">
                      <SheetClose asChild>
                        <Link href="/auth/login" className="flex-1 rounded border border-border bg-white py-2 text-center text-xs font-medium text-foreground">
                          Sign In
                        </Link>
                      </SheetClose>
                      <SheetClose asChild>
                        <Link href="/auth/register" className="flex-1 rounded bg-primary py-2 text-center text-xs font-medium text-white">
                          Register
                        </Link>
                      </SheetClose>
                    </div>
                  </div>
                )}

                <nav className="flex flex-col overflow-y-auto flex-1 p-4">
                  <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Shop by Category</p>
                  <div className="grid grid-cols-2 gap-2">
                    {navCategories.map((cat) => (
                      <SheetClose asChild key={cat.slug}>
                        <Link
                          href={`/category/${cat.slug}`}
                          className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2.5 text-xs font-medium text-foreground transition-colors hover:border-primary/30 hover:bg-stb-red-light hover:text-primary press-active"
                        >
                          {cat.name}
                        </Link>
                      </SheetClose>
                    ))}
                  </div>
                  {session && (
                    <>
                      <p className="mb-3 mt-5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
                      <div className="flex flex-col gap-1">
                        <SheetClose asChild>
                          <Link href="/dashboard" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted press-active">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            My Account
                          </Link>
                        </SheetClose>
                        <SheetClose asChild>
                          <Link href="/dashboard/orders" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted press-active">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            Orders
                          </Link>
                        </SheetClose>
                        {isAdmin && (
                          <SheetClose asChild>
                            <Link href="/admin" className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-medium text-foreground hover:bg-muted press-active">
                              <Settings className="h-3.5 w-3.5 text-muted-foreground" />
                              Admin Panel
                            </Link>
                          </SheetClose>
                        )}
                        <button
                          onClick={() => signOutWithNativeCleanup({ callbackUrl: "/" })}
                          className="mt-1 flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-xs font-medium text-destructive hover:bg-red-50 press-active"
                        >
                          <LogOut className="h-3.5 w-3.5" />
                          Sign Out
                        </button>
                      </div>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>

            {/* Logo */}
            <Link href="/" className="flex shrink-0 items-center">
              <Image
                src="/logo.png"
                alt="Smart Tech Bazaar"
                width={120}
                height={40}
                className="h-8 w-auto object-contain md:h-10"
                priority
              />
            </Link>

            {/* Desktop search */}
            <form action="/search" method="GET" className="relative hidden flex-1 md:flex">
              <div className={`relative w-full transition-all ${searchFocused ? "ring-2 ring-primary/20 rounded-lg" : ""}`}>
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  name="q"
                  placeholder="Search products, brands..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-4 text-xs placeholder:text-muted-foreground focus:border-primary focus:bg-white focus:outline-none transition-all"
                />
              </div>
            </form>

            {/* Mobile search toggle — minimum 44×44px touch target */}
            <button
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              aria-label={mobileSearchOpen ? "Close search" : "Open search"}
              aria-expanded={mobileSearchOpen}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden press-active"
            >
              {mobileSearchOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
            </button>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Wishlist - desktop */}
              <Link 
                href="/wishlist" 
                aria-label={`Wishlist${wishlistCount > 0 ? ` (${wishlistCount} items)` : ""}`}
                className="relative hidden md:flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                <Heart className="h-4.5 w-4.5" aria-hidden="true" />
                {wishlistCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-semibold text-white" aria-hidden="true">
                    {wishlistCount > 9 ? "9+" : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Cart */}
              <Link 
                href="/cart" 
                aria-label={`Shopping cart${cartCount > 0 ? ` (${cartCount} items)` : ""}`}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground press-active md:h-9 md:w-9"
              >
                <ShoppingCart className="h-5 w-5 md:h-4.5 md:w-4.5" aria-hidden="true" />
                {cartCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold leading-none text-white ring-2 ring-white" aria-hidden="true">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </Link>

              {/* Desktop user */}
              {session && (
                <button
                  onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                  className="hidden md:flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white transition-colors hover:bg-stb-red-dark"
                >
                  {session.user?.name?.[0]?.toUpperCase()}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile search bar */}
        {mobileSearchOpen && (
          <div className="border-b border-border bg-white px-3 py-2.5 md:hidden animate-slide-down">
            <form action="/search" method="GET" className="relative">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                name="q"
                placeholder="Search products, brands..."
                autoFocus
                className="h-11 w-full rounded-xl border border-border bg-muted/50 pl-10 pr-4 text-sm placeholder:text-muted-foreground focus:border-primary focus:bg-white focus:outline-none transition-all"
              />
            </form>
          </div>
        )}

        {/* Desktop category nav */}
        <div className="hidden border-b border-border md:block">
          <div className="mx-auto max-w-7xl px-4">
            <nav className="flex items-center gap-0.5 overflow-x-auto scrollbar-hide">
              <Link
                href="/products"
                className="shrink-0 px-3 py-2.5 text-[11px] font-semibold text-primary transition-colors hover:bg-stb-red-light"
              >
                All Products
              </Link>
              {navCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className="shrink-0 px-3 py-2.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {cat.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </header>

      {/* Mobile bottom navigation — hidden on /dashboard/** (dashboard has its own nav) */}
      <nav
        className={`fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-white md:hidden ${pathname.startsWith("/dashboard") ? "hidden" : ""
          }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="grid h-16 grid-cols-5">
          {mobileNavItems.map((item) => {
            const isActive = pathname === item.href;
            const isCart = item.href === "/cart";
            const isWishlist = item.href === "/wishlist";
            const count = isCart ? cartCount : isWishlist ? wishlistCount : 0;

            return (
              <Link
                key={item.href}
                href={item.href}
                className="relative flex flex-col items-center justify-center gap-1 px-1 press-active"
              >
                {/* Active indicator — animated pill behind icon */}
                {isActive && (
                  <span className="absolute top-2 h-8 w-12 rounded-full bg-stb-red-light" />
                )}
                <div className="relative z-10 flex h-6 w-6 items-center justify-center">
                  <item.icon
                    className={`h-[22px] w-[22px] transition-all duration-200 ${isActive
                        ? "text-primary stroke-[2.5]"
                        : "text-[#9CA3AF] stroke-[1.5]"
                      }`}
                  />
                  {count > 0 && (
                    <span className="absolute -right-1.5 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-primary px-0.5 text-[8px] font-bold leading-none text-white ring-2 ring-white">
                      {count > 9 ? "9+" : count}
                    </span>
                  )}
                </div>
                <span
                  className={`relative z-10 text-[10px] font-semibold leading-none transition-colors ${isActive ? "text-primary" : "text-[#9CA3AF]"
                    }`}
                >
                  {item.name}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
