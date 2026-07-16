"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  Loader2,
  Send,
  MessageCircle,
  XCircle,
  ShieldCheck,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface Reply {
  _id: string;
  userName: string;
  userRole: "customer" | "admin" | "super_admin";
  message: string;
  isInternal: boolean;
  createdAt: string;
}

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
  replies: Reply[];
  order?: { orderNumber: string; _id: string };
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

export default function TicketDetailPage() {
  const params = useParams();
  const { data: session } = useSession();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/user/tickets/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.ticket) setTicket(d.ticket);
        else setError("Ticket not found");
      })
      .catch(() => setError("Failed to load ticket"))
      .finally(() => setLoading(false));
  }, [params.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [ticket?.replies]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reply.trim()) return;
    setSending(true);
    setError("");
    try {
      const res = await fetch(`/api/user/tickets/${params.id}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: reply }),
      });
      const data = await res.json();
      if (res.ok) {
        setTicket(data.ticket);
        setReply("");
      } else {
        setError(data.error || "Failed to send reply");
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="h-12 w-12 text-destructive/40 mb-4" />
        <p className="text-base font-semibold">{error || "Ticket not found"}</p>
        <Link href="/dashboard/support" className="mt-4 text-sm text-primary hover:underline">Back to tickets</Link>
      </div>
    );
  }

  const isClosed = ticket.status === "closed";

  return (
    <div className="max-w-2xl space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/support"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-mono text-muted-foreground">{ticket.ticketNumber}</span>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${statusColors[ticket.status] || "bg-gray-100 text-gray-700"}`}>
              {ticket.status.replace("_", " ")}
            </span>
            <span className={`text-xs font-medium capitalize ${priorityColors[ticket.priority] || ""}`}>
              {ticket.priority}
            </span>
          </div>
          <h2 className="font-heading font-bold text-foreground truncate">{ticket.subject}</h2>
        </div>
      </div>

      {/* Ticket info card */}
      <div className="bg-card rounded-xl border border-border p-4 text-sm">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span><strong className="text-foreground">Category:</strong> {ticket.category}</span>
          {ticket.order && (
            <span>
              <strong className="text-foreground">Order:</strong>{" "}
              <Link href={`/dashboard/orders/${ticket.order._id}`} className="text-primary hover:underline">
                {ticket.order.orderNumber}
              </Link>
            </span>
          )}
          <span><strong className="text-foreground">Created:</strong> {new Date(ticket.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
          <span><strong className="text-foreground">Updated:</strong> {new Date(ticket.updatedAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>
          <span><strong className="text-foreground">Replies:</strong> {ticket.replies.length}</span>
        </div>
      </div>

      {/* Messages thread */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="font-heading font-semibold text-foreground text-sm flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            Conversation
          </h3>
        </div>

        <div className="p-5 space-y-5 max-h-[500px] overflow-y-auto">
          {/* Original description */}
          <div className="flex gap-3">
            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <User className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-xs font-semibold text-foreground">{session?.user?.name}</span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(ticket.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </div>
              <div className="bg-muted rounded-xl rounded-tl-none px-4 py-3 text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                {ticket.description}
              </div>
            </div>
          </div>

          {/* Replies */}
          {ticket.replies.map((rep) => {
            const isStaff = rep.userRole === "admin" || rep.userRole === "super_admin";
            return (
              <div key={rep._id} className={`flex gap-3 ${isStaff ? "flex-row-reverse" : ""}`}>
                <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isStaff ? "bg-accent" : "bg-primary/10"}`}>
                  {isStaff ? (
                    <ShieldCheck className="h-4 w-4 text-accent-foreground" />
                  ) : (
                    <User className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className={`flex-1 ${isStaff ? "items-end" : "items-start"} flex flex-col`}>
                  <div className={`flex items-baseline gap-2 mb-1 ${isStaff ? "flex-row-reverse" : ""}`}>
                    <span className="text-xs font-semibold text-foreground">{rep.userName}</span>
                    {isStaff && <span className="text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">Support</span>}
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(rep.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>
                  <div className={`rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-w-[90%] ${
                    isStaff
                      ? "bg-accent text-accent-foreground rounded-tr-none"
                      : "bg-muted text-foreground rounded-tl-none"
                  }`}>
                    {rep.message}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Reply form */}
        {isClosed ? (
          <div className="px-5 py-4 border-t border-border bg-muted/40 text-center">
            <p className="text-sm text-muted-foreground">This ticket is closed. <Link href="/dashboard/support/new" className="text-primary hover:underline">Open a new ticket</Link> if you need further assistance.</p>
          </div>
        ) : (
          <form onSubmit={handleSendReply} className="border-t border-border p-4 space-y-3">
            {error && <p className="text-xs text-destructive">{error}</p>}
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Type your reply..."
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={sending || !reply.trim()} className="gap-2">
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Send Reply
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
