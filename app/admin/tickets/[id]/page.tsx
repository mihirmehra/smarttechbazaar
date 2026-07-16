"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  ArrowLeft,
  Send,
  Clock,
  User,
  Tag,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  ShoppingBag,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface Reply {
  _id: string;
  user: { _id: string; name: string; email: string; role: string };
  message: string;
  isInternal: boolean;
  createdAt: string;
}

interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  customer: { _id: string; name: string; email: string; phone?: string };
  assignedTo?: { _id: string; name: string; email: string };
  order?: { _id: string; orderNumber: string; total: number; status: string };
  category: string;
  priority: string;
  status: string;
  replies: Reply[];
  createdAt: string;
  resolvedAt?: string;
  closedAt?: string;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
}

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  urgent: "bg-red-100 text-red-700",
};

const statusColors: Record<string, string> = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-amber-100 text-amber-700",
  waiting_customer: "bg-purple-100 text-purple-700",
  resolved: "bg-green-100 text-green-700",
  closed: "bg-gray-100 text-gray-700",
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [updating, setUpdating] = useState(false);

  const ticketId = params.id as string;

  useEffect(() => {
    if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
      router.push("/admin");
      return;
    }

    fetchTicket();
    fetchAdminUsers();
  }, [ticketId, session, router]);

  const fetchTicket = async () => {
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`);
      const data = await res.json();

      if (res.ok) {
        setTicket(data.ticket);
      }
    } catch (error) {
      console.error("Error fetching ticket:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAdminUsers = async () => {
    try {
      const res = await fetch("/api/admin/users?limit=100");
      const data = await res.json();

      if (res.ok) {
        setAdminUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  };

  const handleSendReply = async () => {
    if (!replyMessage.trim()) return;

    setSending(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyMessage, isInternal }),
      });

      const data = await res.json();

      if (res.ok) {
        setTicket(data.ticket);
        setReplyMessage("");
        setIsInternal(false);
      }
    } catch (error) {
      console.error("Error sending reply:", error);
    } finally {
      setSending(false);
    }
  };

  const handleUpdateTicket = async (updates: Partial<Ticket>) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/tickets/${ticketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });

      const data = await res.json();

      if (res.ok) {
        setTicket(data.ticket);
      }
    } catch (error) {
      console.error("Error updating ticket:", error);
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!ticket) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Ticket not found</p>
        <Link href="/admin/tickets" className="mt-4 inline-block text-primary hover:underline">
          Back to Tickets
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/tickets"
            className="rounded-lg p-2 hover:bg-muted transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold">{ticket.ticketNumber}</h1>
              <Badge className={statusColors[ticket.status]}>
                {ticket.status.replace("_", " ")}
              </Badge>
              <Badge className={priorityColors[ticket.priority]}>
                {ticket.priority}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{ticket.subject}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Original Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
              <p className="mt-4 text-xs text-muted-foreground">
                Created {new Date(ticket.createdAt).toLocaleString()}
              </p>
            </CardContent>
          </Card>

          {/* Replies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-5 w-5" />
                Conversation ({ticket.replies.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {ticket.replies.length > 0 ? (
                ticket.replies.map((reply) => (
                  <div
                    key={reply._id}
                    className={`rounded-lg border p-4 ${
                      reply.isInternal
                        ? "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20"
                        : reply.user.role === "user"
                        ? "bg-muted/50"
                        : "border-primary/20 bg-primary/5"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                          {reply.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{reply.user.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {reply.user.role === "user" ? "Customer" : reply.user.role.replace("_", " ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {reply.isInternal && (
                          <Badge variant="outline" className="gap-1 text-amber-600">
                            <Lock className="h-3 w-3" />
                            Internal
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {new Date(reply.createdAt).toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap text-sm">
                      {reply.message}
                    </p>
                  </div>
                ))
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No replies yet
                </p>
              )}

              {/* Reply Form */}
              {ticket.status !== "closed" && (
                <div className="space-y-3 pt-4 border-t">
                  <Textarea
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={4}
                  />
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={isInternal}
                        onChange={(e) => setIsInternal(e.target.checked)}
                        className="rounded border-gray-300"
                      />
                      <Lock className="h-4 w-4 text-amber-500" />
                      Internal note (not visible to customer)
                    </label>
                    <Button
                      onClick={handleSendReply}
                      disabled={!replyMessage.trim() || sending}
                      className="gap-2"
                    >
                      <Send className="h-4 w-4" />
                      {sending ? "Sending..." : "Send Reply"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <User className="h-5 w-5" />
                Customer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="font-medium">{ticket.customer?.name || "Unknown"}</p>
              <p className="text-sm text-muted-foreground">
                {ticket.customer?.email}
              </p>
              {ticket.customer?.phone && (
                <p className="text-sm text-muted-foreground">
                  {ticket.customer.phone}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Order Info */}
          {ticket.order && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShoppingBag className="h-5 w-5" />
                  Related Order
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Link
                  href={`/admin/orders/${ticket.order._id}`}
                  className="text-primary hover:underline"
                >
                  #{ticket.order.orderNumber}
                </Link>
                <p className="text-sm text-muted-foreground">
                  ${ticket.order.total?.toFixed(2)} - {ticket.order.status}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Ticket Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status */}
              <div>
                <label className="text-sm font-medium">Status</label>
                <select
                  value={ticket.status}
                  onChange={(e) => handleUpdateTicket({ status: e.target.value })}
                  disabled={updating}
                  className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="waiting_customer">Waiting for Customer</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="text-sm font-medium">Priority</label>
                <select
                  value={ticket.priority}
                  onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                  disabled={updating}
                  className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              {/* Assigned To */}
              <div>
                <label className="text-sm font-medium">Assigned To</label>
                <select
                  value={ticket.assignedTo?._id || ""}
                  onChange={(e) =>
                    handleUpdateTicket({
                      assignedTo: e.target.value || undefined,
                    } as Partial<Ticket>)
                  }
                  disabled={updating}
                  className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
                >
                  <option value="">Unassigned</option>
                  {adminUsers.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-col gap-2 pt-2">
                {ticket.status !== "resolved" && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleUpdateTicket({ status: "resolved" })}
                    disabled={updating}
                  >
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    Mark as Resolved
                  </Button>
                )}
                {ticket.status !== "closed" && (
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => handleUpdateTicket({ status: "closed" })}
                    disabled={updating}
                  >
                    Close Ticket
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary" />
                  <span>Created {new Date(ticket.createdAt).toLocaleDateString()}</span>
                </div>
                {ticket.resolvedAt && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500" />
                    <span>Resolved {new Date(ticket.resolvedAt).toLocaleDateString()}</span>
                  </div>
                )}
                {ticket.closedAt && (
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-gray-400" />
                    <span>Closed {new Date(ticket.closedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
