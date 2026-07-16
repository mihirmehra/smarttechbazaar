"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ChevronDown, Truck, CreditCard, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface OrderStatusUpdaterProps {
  orderId: string;
  currentStatus: string;
  currentPaymentStatus: string;
  trackingNumber?: string;
  trackingUrl?: string;
}

const orderStatuses = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const paymentStatuses = [
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

export default function OrderStatusUpdater({
  orderId,
  currentStatus,
  currentPaymentStatus,
  trackingNumber: initialTracking = "",
  trackingUrl: initialTrackingUrl = "",
}: OrderStatusUpdaterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"status" | "payment" | "tracking">("status");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [paymentStatus, setPaymentStatus] = useState(currentPaymentStatus);
  const [trackingNumber, setTrackingNumber] = useState(initialTracking);
  const [trackingUrl, setTrackingUrl] = useState(initialTrackingUrl);
  const [cancellationReason, setCancellationReason] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const updateData: Record<string, unknown> = {};

      if (activeTab === "status") {
        updateData.status = status;
        if (status === "cancelled") {
          updateData.cancellationReason = cancellationReason;
        }
      } else if (activeTab === "payment") {
        updateData.paymentStatus = paymentStatus;
      } else if (activeTab === "tracking") {
        updateData.trackingNumber = trackingNumber;
        updateData.trackingUrl = trackingUrl;
        if (!currentStatus.match(/shipped|delivered/)) {
          updateData.status = "shipped";
        }
      }

      const response = await fetch(`/api/admin/orders/${orderId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update order");
      }

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error updating order:", error);
      alert(error instanceof Error ? error.message : "Failed to update order");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
          <h3 className="text-lg font-semibold mb-4">Update Order</h3>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setActiveTab("status")}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "status" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <Package className="h-4 w-4" />
              Status
            </button>
            <button
              onClick={() => setActiveTab("payment")}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "payment" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <CreditCard className="h-4 w-4" />
              Payment
            </button>
            <button
              onClick={() => setActiveTab("tracking")}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "tracking" ? "bg-primary text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              <Truck className="h-4 w-4" />
              Tracking
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {activeTab === "status" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Order Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                  >
                    {orderStatuses.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>

                {status === "cancelled" && (
                  <div>
                    <label className="mb-1.5 block text-sm font-medium">
                      Cancellation Reason
                    </label>
                    <textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Enter reason for cancellation"
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                    />
                  </div>
                )}
              </>
            )}

            {activeTab === "payment" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium">Payment Status</label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm"
                >
                  {paymentStatuses.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {activeTab === "tracking" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Tracking Number</label>
                  <Input
                    type="text"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium">Tracking URL</label>
                  <Input
                    type="url"
                    value={trackingUrl}
                    onChange={(e) => setTrackingUrl(e.target.value)}
                    placeholder="https://tracking.example.com/..."
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Adding tracking will automatically mark the order as shipped.
                </p>
              </>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <Button onClick={() => setIsOpen(true)} className="gap-2">
      Update Order
      <ChevronDown className="h-4 w-4" />
    </Button>
  );
}
