"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
}

const categories = [
  { value: "order", label: "Order Issue" },
  { value: "product", label: "Product Question" },
  { value: "payment", label: "Payment Problem" },
  { value: "shipping", label: "Shipping & Delivery" },
  { value: "refund", label: "Refund Request" },
  { value: "account", label: "Account Issue" },
  { value: "other", label: "Other" },
];

const priorities = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export default function NewTicketPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [form, setForm] = useState({
    subject: "",
    description: "",
    category: "other",
    priority: "medium",
    orderId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/user/orders")
      .then((r) => r.json())
      .then((d) => setOrders(d.orders || []));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/user/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: form.subject,
          description: form.description,
          category: form.category,
          priority: form.priority,
          orderId: form.orderId || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/dashboard/support/${data.ticket._id}`);
      } else {
        setError(data.error || "Failed to create ticket");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl space-y-5">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/support"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="font-heading font-bold text-foreground">Open a Support Ticket</h2>
          <p className="text-xs text-muted-foreground">We typically respond within 24 hours</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-5 space-y-4">
        {error && (
          <p className="text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-lg">{error}</p>
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="category">Category</Label>
            <select
              id="category"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {categories.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="priority">Priority</Label>
            <select
              id="priority"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {priorities.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>
        </div>

        {orders.length > 0 && (
          <div className="space-y-1.5">
            <Label htmlFor="order">Related Order (optional)</Label>
            <select
              id="order"
              value={form.orderId}
              onChange={(e) => setForm({ ...form, orderId: e.target.value })}
              className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="">None</option>
              {orders.map((o) => (
                <option key={o._id} value={o._id}>{o.orderNumber} — {o.status}</option>
              ))}
            </select>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input
            id="subject"
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            placeholder="Brief description of your issue"
            required
            maxLength={150}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Please provide as much detail as possible about your issue..."
            required
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground text-right">{form.description.length} characters</p>
        </div>

        <div className="flex gap-3 pt-1">
          <Button type="submit" disabled={submitting} className="gap-2">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit Ticket
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/dashboard/support">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
