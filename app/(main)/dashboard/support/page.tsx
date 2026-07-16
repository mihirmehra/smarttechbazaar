"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LifeBuoy, Plus, ChevronRight, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  replies: { _id: string }[];
  order?: { orderNumber: string };
}

const statusColors: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  waiting: "bg-orange-100 text-orange-800",
  resolved: "bg-green-100 text-green-800",
  closed: "bg-gray-100 text-gray-700",
};

const priorityColors: Record<string, string> = {
  low: "text-gray-500",
  medium: "text-yellow-600",
  high: "text-orange-500",
  urgent: "text-red-600",
};

const categoryLabels: Record<string, string> = {
  order: "Order",
  product: "Product",
  payment: "Payment",
  shipping: "Shipping",
  refund: "Refund",
  account: "Account",
  other: "Other",
};

const filters = ["all", "open", "in_progress", "waiting", "resolved", "closed"];

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/user/tickets")
      .then((r) => r.json())
      .then((d) => setTickets(d.tickets || []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = tickets.filter((t) => {
    const matchesFilter = activeFilter === "all" || t.status === activeFilter;
    const matchesSearch =
      !search ||
      t.subject.toLowerCase().includes(search.toLowerCase()) ||
      t.ticketNumber.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Top actions */}
      <div className="flex items-center gap-3">
        <Button asChild size="sm" className="gap-2 shrink-0">
          <Link href="/dashboard/support/new">
            <Plus className="h-4 w-4" />
            New Ticket
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-2xl border border-border p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by subject or ticket number..."
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
              {f === "in_progress" ? "In Progress" : f}
              {f === "all" ? ` (${tickets.length})` : ` (${tickets.filter((t) => t.status === f).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Tickets */}
      {filtered.length === 0 ? (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center">
          <LifeBuoy className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-base font-semibold text-foreground">No tickets found</p>
          <p className="text-sm text-muted-foreground mt-1">
            {search || activeFilter !== "all" ? "Try adjusting your filters" : "Need help? Open a support ticket"}
          </p>
          {!search && activeFilter === "all" && (
            <Button asChild size="sm" className="mt-5 gap-2">
              <Link href="/dashboard/support/new">
                <Plus className="h-4 w-4" />
                Create Ticket
              </Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((ticket) => (
            <Link
              key={ticket._id}
              href={`/dashboard/support/${ticket._id}`}
              className="bg-card rounded-2xl border border-border hover:shadow-md hover:border-primary/20 transition-all block press-active"
            >
              <div className="flex items-start justify-between p-5">
                <div className="flex-1 min-w-0 mr-4">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[ticket.status] || "bg-gray-100 text-gray-700"}`}>
                      {ticket.status.replace("_", " ")}
                    </span>
                    <span className={`text-xs font-medium capitalize ${priorityColors[ticket.priority] || ""}`}>
                      {ticket.priority} priority
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-foreground truncate">{ticket.subject}</h3>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{categoryLabels[ticket.category] || ticket.category}</span>
                    {ticket.order && <span>Order: {ticket.order.orderNumber}</span>}
                    <span>{ticket.replies.length} repl{ticket.replies.length !== 1 ? "ies" : "y"}</span>
                    <span>Updated {new Date(ticket.updatedAt).toLocaleDateString("en-IN")}</span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
