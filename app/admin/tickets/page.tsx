"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Plus,
  Search,
  Eye,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Filter,
  MessageSquare,
  User,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import DeleteTicketButton from "@/components/admin/DeleteTicketButton";

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  customer: { _id: string; name: string; email: string };
  assignedTo?: { _id: string; name: string; email: string };
  order?: { _id: string; orderNumber: string };
  category: string;
  priority: string;
  status: string;
  replies: Array<unknown>;
  lastReplyAt?: string;
  createdAt: string;
}

interface Stats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  medium: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  high: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  urgent: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_progress: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  waiting_customer: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  resolved: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  closed: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const statusIcons: Record<string, React.ReactNode> = {
  open: <AlertCircle className="h-3 w-3" />,
  in_progress: <Clock className="h-3 w-3" />,
  waiting_customer: <User className="h-3 w-3" />,
  resolved: <CheckCircle className="h-3 w-3" />,
  closed: <XCircle className="h-3 w-3" />,
};

export default function TicketsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [priorityFilter, setPriorityFilter] = useState(searchParams.get("priority") || "all");
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
      router.push("/admin");
      return;
    }

    // Debounce search, immediate for other filters
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      fetchTickets();
    }, 300);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [session, page, search, statusFilter, priorityFilter]);

  const fetchTickets = async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (priorityFilter !== "all") params.set("priority", priorityFilter);

      const res = await fetch(`/api/admin/tickets?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setTickets(data.tickets);
        setTotal(data.total);
        setTotalPages(data.totalPages);
        setStats(data.stats);
      }
    } catch (error) {
      console.error("Error fetching tickets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // No-op: search is debounced via useEffect. Kept to satisfy form onSubmit.
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Tickets</h1>
          <p className="text-sm text-muted-foreground">
            Manage customer support requests ({total} tickets)
          </p>
        </div>
        <Link href="/admin/tickets/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Ticket
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-5">
          <Card className={statusFilter === "all" ? "ring-2 ring-primary" : ""}>
            <CardContent className="pt-4">
              <button
                onClick={() => setStatusFilter("all")}
                className="w-full text-left"
              >
                <p className="text-xs text-muted-foreground">All Tickets</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </button>
            </CardContent>
          </Card>
          <Card className={statusFilter === "open" ? "ring-2 ring-primary" : ""}>
            <CardContent className="pt-4">
              <button
                onClick={() => setStatusFilter("open")}
                className="w-full text-left"
              >
                <p className="text-xs text-blue-600">Open</p>
                <p className="text-2xl font-bold text-blue-600">{stats.open}</p>
              </button>
            </CardContent>
          </Card>
          <Card className={statusFilter === "in_progress" ? "ring-2 ring-primary" : ""}>
            <CardContent className="pt-4">
              <button
                onClick={() => setStatusFilter("in_progress")}
                className="w-full text-left"
              >
                <p className="text-xs text-amber-600">In Progress</p>
                <p className="text-2xl font-bold text-amber-600">{stats.inProgress}</p>
              </button>
            </CardContent>
          </Card>
          <Card className={statusFilter === "resolved" ? "ring-2 ring-primary" : ""}>
            <CardContent className="pt-4">
              <button
                onClick={() => setStatusFilter("resolved")}
                className="w-full text-left"
              >
                <p className="text-xs text-green-600">Resolved</p>
                <p className="text-2xl font-bold text-green-600">{stats.resolved}</p>
              </button>
            </CardContent>
          </Card>
          <Card className={statusFilter === "closed" ? "ring-2 ring-primary" : ""}>
            <CardContent className="pt-4">
              <button
                onClick={() => setStatusFilter("closed")}
                className="w-full text-left"
              >
                <p className="text-xs text-muted-foreground">Closed</p>
                <p className="text-2xl font-bold">{stats.closed}</p>
              </button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-card p-4 shadow-sm">
        <form onSubmit={handleSearch} className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-10"
          />
        </form>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <select
            value={priorityFilter}
            onChange={(e) => {
              setPriorityFilter(e.target.value);
              setPage(1);
            }}
            className="h-10 rounded-md border bg-background px-3 text-sm"
          >
            <option value="all">All Priorities</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>
      </div>

      {/* Tickets Table */}
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Ticket
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Customer
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Priority
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Assigned To
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Last Activity
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {tickets.length > 0 ? (
                tickets.map((ticket) => (
                  <tr key={ticket._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-xs text-muted-foreground">
                          {ticket.ticketNumber}
                        </p>
                        <p className="font-medium line-clamp-1">
                          {ticket.subject}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {ticket.category}
                          </Badge>
                          {ticket.order && (
                            <span>Order #{ticket.order.orderNumber}</span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium">
                          {ticket.customer?.name || "Unknown"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {ticket.customer?.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={priorityColors[ticket.priority]}>
                        {ticket.priority}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge className={`gap-1 ${statusColors[ticket.status]}`}>
                        {statusIcons[ticket.status]}
                        {ticket.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {ticket.assignedTo ? (
                        <div>
                          <p className="text-sm">{ticket.assignedTo.name}</p>
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Unassigned
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(
                          ticket.lastReplyAt || ticket.createdAt
                        ).toLocaleDateString()}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageSquare className="h-3 w-3" />
                        {ticket.replies?.length || 0} replies
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/tickets/${ticket._id}`}
                          className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        {session?.user?.role === "super_admin" && (
                          <DeleteTicketButton
                            ticketId={ticket._id}
                            ticketNumber={ticket.ticketNumber}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <MessageSquare className="mx-auto h-12 w-12 text-muted-foreground/50" />
                    <p className="mt-4 text-muted-foreground">No tickets found</p>
                    <Link
                      href="/admin/tickets/new"
                      className="mt-2 inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Plus className="h-4 w-4" />
                      Create your first ticket
                    </Link>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-4 py-3">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
