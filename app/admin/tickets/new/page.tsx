"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Customer {
  _id: string;
  name: string;
  email: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  total: number;
}

export default function NewTicketPage() {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  
  const [formData, setFormData] = useState({
    customer: "",
    subject: "",
    description: "",
    category: "general",
    priority: "medium",
    order: "",
  });

  useEffect(() => {
    if (!session?.user?.role || !["admin", "super_admin"].includes(session.user.role)) {
      router.push("/admin");
    }
  }, [session, router]);

  useEffect(() => {
    const searchCustomers = async () => {
      if (customerSearch.length < 2) {
        setCustomers([]);
        return;
      }

      try {
        const res = await fetch(`/api/admin/customers?search=${encodeURIComponent(customerSearch)}&limit=10`);
        const data = await res.json();
        if (res.ok) {
          setCustomers(data.customers || []);
        }
      } catch (error) {
        console.error("Error searching customers:", error);
      }
    };

    const debounce = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounce);
  }, [customerSearch]);

  useEffect(() => {
    const fetchOrders = async () => {
      if (!formData.customer) {
        setOrders([]);
        return;
      }

      try {
        const res = await fetch(`/api/admin/orders?customer=${formData.customer}&limit=20`);
        const data = await res.json();
        if (res.ok) {
          setOrders(data.orders || []);
        }
      } catch (error) {
        console.error("Error fetching orders:", error);
      }
    };

    fetchOrders();
  }, [formData.customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (!formData.customer) {
      setError("Please select a customer");
      setLoading(false);
      return;
    }

    if (!formData.subject.trim()) {
      setError("Please enter a subject");
      setLoading(false);
      return;
    }

    if (!formData.description.trim()) {
      setError("Please enter a description");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/admin/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          order: formData.order || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create ticket");
      }

      router.push(`/admin/tickets/${data.ticket._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find((c) => c._id === formData.customer);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/tickets"
          className="rounded-lg p-2 hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Create Ticket</h1>
          <p className="text-sm text-muted-foreground">
            Create a support ticket on behalf of a customer
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-4 text-destructive">
                <AlertCircle className="h-5 w-5" />
                {error}
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Ticket Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Subject *</label>
                  <Input
                    value={formData.subject}
                    onChange={(e) =>
                      setFormData({ ...formData, subject: e.target.value })
                    }
                    placeholder="Brief description of the issue"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Description *</label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Detailed description of the issue..."
                    rows={6}
                    className="mt-1"
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) =>
                        setFormData({ ...formData, category: e.target.value })
                      }
                      className="mt-1 w-full rounded-md border bg-background p-2"
                    >
                      <option value="general">General</option>
                      <option value="order">Order Issue</option>
                      <option value="shipping">Shipping</option>
                      <option value="return">Return/Refund</option>
                      <option value="product">Product Question</option>
                      <option value="payment">Payment</option>
                      <option value="account">Account</option>
                      <option value="technical">Technical</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) =>
                        setFormData({ ...formData, priority: e.target.value })
                      }
                      className="mt-1 w-full rounded-md border bg-background p-2"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Search Customer *</label>
                  <Input
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      if (!e.target.value) {
                        setFormData({ ...formData, customer: "", order: "" });
                      }
                    }}
                    placeholder="Search by name or email..."
                    className="mt-1"
                  />

                  {customers.length > 0 && !formData.customer && (
                    <div className="mt-2 max-h-40 overflow-y-auto rounded-md border bg-background">
                      {customers.map((customer) => (
                        <button
                          key={customer._id}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, customer: customer._id });
                            setCustomerSearch(customer.name);
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-muted text-sm"
                        >
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {customer.email}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}

                  {selectedCustomer && (
                    <div className="mt-2 rounded-md border bg-primary/5 p-3">
                      <p className="font-medium">{selectedCustomer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedCustomer.email}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setFormData({ ...formData, customer: "", order: "" });
                          setCustomerSearch("");
                        }}
                        className="mt-2 text-xs text-primary hover:underline"
                      >
                        Change customer
                      </button>
                    </div>
                  )}
                </div>

                {orders.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Related Order</label>
                    <select
                      value={formData.order}
                      onChange={(e) =>
                        setFormData({ ...formData, order: e.target.value })
                      }
                      className="mt-1 w-full rounded-md border bg-background p-2"
                    >
                      <option value="">None</option>
                      {orders.map((order) => (
                        <option key={order._id} value={order._id}>
                          #{order.orderNumber} - ${order.total?.toFixed(2)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating..." : "Create Ticket"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
