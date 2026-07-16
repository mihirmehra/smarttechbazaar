"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  FolderTree,
  ShoppingCart,
  Users,
  Image,
  Truck,
  Settings,
  FileText,
  BarChart3,
  Tag,
  Warehouse,
  TicketCheck,
  Bell,
  Activity,
  Home,
  Globe,
} from "lucide-react";

interface AdminSidebarProps {
  userRole: "admin" | "super_admin";
}

const menuItems = [
  {
    title: "Dashboard",
    href: "/admin",
    icon: LayoutDashboard,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Products",
    href: "/admin/products",
    icon: Package,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Categories",
    href: "/admin/categories",
    icon: FolderTree,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Brands",
    href: "/admin/brands",
    icon: Tag,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Coupons",
    href: "/admin/coupons",
    icon: Tag,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: Warehouse,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Orders",
    href: "/admin/orders",
    icon: ShoppingCart,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Customers",
    href: "/admin/customers",
    icon: Users,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Tickets",
    href: "/admin/tickets",
    icon: TicketCheck,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Users",
    href: "/admin/users",
    icon: Users,
    roles: ["super_admin"],
  },
  {
    title: "Homepage",
    href: "/admin/homepage",
    icon: Home,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Banners",
    href: "/admin/banners",
    icon: Image,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Shipping",
    href: "/admin/shipping",
    icon: Truck,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Reports",
    href: "/admin/reports",
    icon: BarChart3,
    roles: ["admin", "super_admin"],
  },
  {
    title: "SEO",
    href: "/admin/seo",
    icon: Globe,
    roles: ["admin", "super_admin"],
  },
  {
    title: "Activity Log",
    href: "/admin/activity",
    icon: Activity,
    roles: ["super_admin"],
  },
  {
    title: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["super_admin"],
  },
];

export default function AdminSidebar({ userRole }: AdminSidebarProps) {
  const pathname = usePathname();

  const filteredMenuItems = menuItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
          <span className="font-heading text-sm font-bold text-white">S</span>
        </div>
        <div>
          <h1 className="font-heading text-lg font-bold text-primary">STB</h1>
          <p className="body-sm -mt-1 text-xs text-muted-foreground">Admin Panel</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <ul className="flex flex-col gap-1">
          {filteredMenuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname.startsWith(item.href));

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Back to Store */}
      <div className="border-t border-border p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <FileText className="h-5 w-5" />
          Back to Store
        </Link>
      </div>
    </aside>
  );
}
