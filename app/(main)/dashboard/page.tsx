"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ShoppingBag,
  Heart,
  LifeBuoy,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  ChevronRight,
  Package,
} from "lucide-react";

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  status: string;
  createdAt: string;
  items: { name: string; quantity: number; image?: string }[];
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  status: string;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  processing: "bg-blue-100 text-blue-700",
  shipped: "bg-purple-100 text-purple-700",
  delivered: "bg-green-100 text-green-700",
  cancelled: "bg-red-100 text-red-700",
  returned: "bg-gray-100 text-gray-600",
};

const ticketStatusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-700",
  in_progress: "bg-blue-100 text-blue-700",
  waiting: "bg-orange-100 text-orange-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-600",
};

export default function DashboardPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [addresses, setAddresses] = useState<unknown[]>([]);
  const [wishlistCount, setWishlistCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [ordersRes, ticketsRes, addressesRes, wishlistRes] = await Promise.all([
          fetch("/api/user/orders"),
          fetch("/api/user/tickets"),
          fetch("/api/user/addresses"),
          fetch("/api/wishlist"),
        ]);
        if (ordersRes.ok) setOrders((await ordersRes.json()).orders || []);
        if (ticketsRes.ok) setTickets((await ticketsRes.json()).tickets || []);
        if (addressesRes.ok) setAddresses((await addressesRes.json()).addresses || []);
        if (wishlistRes.ok) setWishlistCount((await wishlistRes.json()).items?.length || 0);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const firstName = session?.user?.name?.split(" ")[0] ?? "there";
  const pendingOrders = orders.filter((o) =>
    ["pending", "confirmed", "processing", "shipped"].includes(o.status)
  ).length;
  const deliveredOrders = orders.filter((o) => o.status === "delivered").length;
  const cancelledOrders = orders.filter((o) => o.status === "cancelled").length;
  const openTickets = tickets.filter((t) =>
    ["open", "in_progress", "waiting"].includes(t.status)
  ).length;

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Greeting skeleton */}
        <div className="h-24 rounded-2xl bg-card border border-border animate-pulse" />
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
        {/* Recent orders skeleton */}
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-card border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Greeting card ──────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl bg-[#1A1A1A] px-5 py-5">
        {/* Decorative circle */}
        <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-primary/20" />
        <div className="pointer-events-none absolute -bottom-4 right-10 h-16 w-16 rounded-full bg-primary/10" />
        <p className="relative text-xs font-medium text-white/50">Welcome back</p>
        <h2 className="relative mt-0.5 text-xl font-bold text-white">{firstName}</h2>
        <div className="relative mt-3 flex items-center gap-2">
          {pendingOrders > 0 ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/20 px-3 py-1 text-xs font-semibold text-primary">
              <Clock className="h-3.5 w-3.5" />
              {pendingOrders} active order{pendingOrders !== 1 ? "s" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-green-500/20 px-3 py-1 text-xs font-semibold text-green-400">
              <CheckCircle className="h-3.5 w-3.5" />
              All orders delivered
            </span>
          )}
        </div>
      </div>

      {/* ── Stats grid ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          {
            label: "Total Orders",
            value: orders.length,
            icon: ShoppingBag,
            href: "/dashboard/orders",
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Active",
            value: pendingOrders,
            icon: Clock,
            href: "/dashboard/orders",
            color: "text-amber-600",
            bg: "bg-amber-50",
          },
          {
            label: "Delivered",
            value: deliveredOrders,
            icon: CheckCircle,
            href: "/dashboard/orders",
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Wishlist",
            value: wishlistCount,
            icon: Heart,
            href: "/dashboard/wishlist",
            color: "text-rose-500",
            bg: "bg-rose-50",
          },
        ].map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4 transition-shadow hover:shadow-md press-active"
          >
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.bg}`}>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-extrabold leading-none text-foreground">{stat.value}</p>
              <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">{stat.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Quick actions row ──────────────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:hidden">
        {[
          { label: "Addresses", value: `${addresses.length} saved`, href: "/dashboard/addresses", icon: MapPin, color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Support", value: openTickets > 0 ? `${openTickets} open` : "Get help", href: "/dashboard/support", icon: LifeBuoy, color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Cancelled", value: `${cancelledOrders} orders`, href: "/dashboard/orders", icon: XCircle, color: "text-red-500", bg: "bg-red-50" },
        ].map((item) => (
          <Link
            key={item.href + item.label}
            href={item.href}
            className="flex shrink-0 items-center gap-2.5 rounded-2xl border border-border bg-card px-4 py-3 press-active"
          >
            <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${item.bg}`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-[10px] text-muted-foreground">{item.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Recent orders ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
          <h2 className="text-sm font-bold text-foreground">Recent Orders</h2>
          <Link
            href="/dashboard/orders"
            className="flex items-center gap-0.5 text-xs font-semibold text-primary"
          >
            View all
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <ShoppingBag className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-semibold text-foreground">No orders yet</p>
            <p className="text-xs text-muted-foreground mt-1">Your orders will appear here</p>
            <Link href="/" className="mt-4 text-xs font-semibold text-primary">
              Start shopping
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {orders.slice(0, 4).map((order) => (
              <li key={order._id}>
                <Link
                  href={`/dashboard/orders/${order._id}`}
                  className="flex items-center justify-between px-4 py-3.5 transition-colors hover:bg-muted/50 press-active"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* Item image or icon */}
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl border border-border bg-muted flex items-center justify-center">
                      {order.items?.[0]?.image ? (
                        <img
                          src={order.items[0].image}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <Package className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        {order.orderNumber}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {order.items?.length} item{order.items?.length !== 1 ? "s" : ""} &middot;{" "}
                        {new Date(order.createdAt).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0 ml-3">
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                        statusColors[order.status] || "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="text-xs font-bold text-foreground">
                      ₹{(order.total ?? 0).toLocaleString("en-IN")}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Support tickets ───────────────────────────────────────────── */}
      {tickets.length > 0 && (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex items-center justify-between px-4 py-3.5 border-b border-border">
            <h2 className="text-sm font-bold text-foreground">Support Tickets</h2>
            <Link
              href="/dashboard/support/new"
              className="flex items-center gap-0.5 text-xs font-semibold text-primary"
            >
              New ticket
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <ul className="divide-y divide-border">
            {tickets.slice(0, 3).map((ticket) => (
              <li key={ticket._id}>
                <Link
                  href={`/dashboard/support/${ticket._id}`}
                  className="flex items-center justify-between px-4 py-3.5 hover:bg-muted/50 press-active"
                >
                  <div className="min-w-0 mr-3">
                    <p className="text-sm font-medium text-foreground truncate">{ticket.subject}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{ticket.ticketNumber}</p>
                  </div>
                  <span
                    className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      ticketStatusColors[ticket.status] || "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {ticket.status.replace("_", " ")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
