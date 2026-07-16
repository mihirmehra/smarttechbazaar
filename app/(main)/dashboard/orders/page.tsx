"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag, Search, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  shippingCost: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  items: { name: string; quantity: number; price: number; image?: string }[];
  shippingAddress: { name: string; city: string; state: string };
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-blue-100 text-blue-800",
  shipped: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
  returned: "bg-gray-100 text-gray-700",
};

const paymentStatusColors: Record<string, string> = {
  pending: "text-yellow-600",
  paid: "text-green-600",
  failed: "text-red-600",
  refunded: "text-blue-600",
};

const filters = ["all", "pending", "confirmed", "processing", "shipped", "delivered", "cancelled"];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/user/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = orders.filter((order) => {
    const matchesFilter = activeFilter === "all" || order.status === activeFilter;
    const matchesSearch =
      !search ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.items.some((item) => item.name.toLowerCase().includes(search.toLowerCase()));
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 h-28 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Filters & Search */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number or product..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`shrink-0 px-3 py-2 rounded-xl text-xs font-semibold capitalize transition-colors press-active ${
                activeFilter === f
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
              {f === "all" ? ` (${orders.length})` : ` (${orders.filter((o) => o.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Orders */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center">
          <ShoppingBag className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-base font-semibold text-foreground">No orders found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || activeFilter !== "all" ? "Try adjusting your filters" : "You haven't placed any orders yet"}
          </p>
          {!search && activeFilter === "all" && (
            <Link href="/" className="mt-4 text-sm text-primary hover:underline">
              Start shopping
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((order) => (
            <Link
              key={order._id}
              href={`/dashboard/orders/${order._id}`}
              className="bg-card rounded-2xl border border-border hover:shadow-md hover:border-primary/20 transition-all block press-active"
            >
              {/* Order Header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
                <div className="flex items-center gap-3">
                  <p className="text-sm font-semibold text-foreground">{order.orderNumber}</p>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
                    {order.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">
                    ₹{(order.total ?? 0).toLocaleString("en-IN")}
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>

              {/* Order Items Preview */}
              <div className="px-5 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {order.items.slice(0, 3).map((item, idx) => (
                      <div
                        key={idx}
                        className="h-9 w-9 rounded-lg border-2 border-background bg-muted flex items-center justify-center overflow-hidden"
                      >
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                    {order.items.length > 3 && (
                      <div className="h-9 w-9 rounded-lg border-2 border-background bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
                        +{order.items.length - 3}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">
                      {order.items[0]?.name}
                      {order.items.length > 1 && ` & ${order.items.length - 1} more`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Order Footer */}
              <div className="flex items-center justify-between px-5 py-2.5 bg-muted/40 rounded-b-xl">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="capitalize">{order.paymentMethod ? order.paymentMethod.replace("_", " ") : "Unknown"}</span>
                  <span className={`font-medium capitalize ${paymentStatusColors[order.paymentStatus] || ""}`}>
                    {order.paymentStatus}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {order.shippingAddress
                    ? `${order.shippingAddress.city}, ${order.shippingAddress.state}`
                    : "Address not available"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
