"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  ShoppingBag,
  Loader2,
  XCircle,
  CheckCircle,
  Truck,
  ClipboardList,
  Clock,
  RotateCcw,
  Download,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ViewInvoiceButton from "@/components/orders/ViewInvoiceButton";

interface OrderItem {
  product: string;
  name: string;
  sku: string;
  image?: string;
  price: number;
  quantity: number;
  total: number;
}

interface TaxBreakdown {
  taxType: "INTRA" | "INTER";
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  customerStateCode: string;
  customerGstin?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  items: OrderItem[];
  shippingAddress: { name: string; phone: string; address: string; city: string; state: string; pincode: string };
  subtotal: number;
  shippingCost: number;
  tax: number;
  discount: number;
  total: number;
  taxBreakdown?: TaxBreakdown;
  notes?: string;
  trackingNumber?: string;
  trackingUrl?: string;
  estimatedDelivery?: string;
  createdAt: string;
  cancelledAt?: string;
  cancellationReason?: string;
  deliveredAt?: string;
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

const timeline = [
  { status: "pending", label: "Order Placed", icon: ClipboardList },
  { status: "confirmed", label: "Confirmed", icon: CheckCircle },
  { status: "processing", label: "Processing", icon: Package },
  { status: "shipped", label: "Shipped", icon: Truck },
  { status: "delivered", label: "Delivered", icon: CheckCircle },
];

const statusOrder = ["pending", "confirmed", "processing", "shipped", "delivered"];

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/user/orders/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.order) setOrder(d.order);
        else setError("Order not found");
      })
      .catch(() => setError("Failed to load order"))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/user/orders/${params.id}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setOrder(data.order);
        setShowCancelConfirm(false);
      } else {
        setError(data.error || "Failed to cancel order");
      }
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center">
        <XCircle className="h-12 w-12 text-destructive/40 mb-4" />
        <p className="text-base font-semibold">{error || "Order not found"}</p>
        <Link href="/dashboard/orders" className="mt-4 text-sm text-primary hover:underline">Back to orders</Link>
      </div>
    );
  }

  const currentStatusIdx = statusOrder.indexOf(order.status);
  const canCancel = ["pending", "confirmed"].includes(order.status);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/dashboard/orders"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h2 className="font-heading font-bold text-foreground">{order.orderNumber}</h2>
          <p className="text-xs text-muted-foreground">Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", { dateStyle: "full" })}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {order.paymentStatus === "paid" && (
            <>
              <ViewInvoiceButton orderId={order._id} size="sm" />
              <Link href={`/dashboard/orders/${order._id}/invoice`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <FileText className="h-4 w-4" />
                  <span className="hidden sm:inline">Full Invoice</span>
                </Button>
              </Link>
              <a href={`/api/orders/${order._id}/invoice/pdf`} download>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF</span>
                </Button>
              </a>
            </>
          )}
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusColors[order.status] || "bg-gray-100 text-gray-700"}`}>
            {order.status}
          </span>
        </div>
      </div>

      {/* Cancel error */}
      {error && <p className="text-sm text-destructive bg-destructive/10 px-4 py-2.5 rounded-lg">{error}</p>}

      {/* Order Timeline */}
      {!["cancelled", "returned"].includes(order.status) && (
        <div className="bg-card rounded-xl border border-border p-5">
          <h3 className="font-heading font-semibold text-foreground mb-4 text-sm">Order Status</h3>
          <div className="flex items-center justify-between relative">
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
            <div
              className="absolute top-5 left-0 h-0.5 bg-primary transition-all"
              style={{ width: `${(currentStatusIdx / (timeline.length - 1)) * 100}%` }}
            />
            {timeline.map((step, idx) => {
              const isDone = idx <= currentStatusIdx;
              return (
                <div key={step.status} className="flex flex-col items-center gap-2 relative z-10">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 transition-colors ${isDone ? "bg-primary border-primary" : "bg-card border-border"}`}>
                    <step.icon className={`h-4 w-4 ${isDone ? "text-white" : "text-muted-foreground"}`} />
                  </div>
                  <span className={`text-[10px] font-medium text-center leading-tight ${isDone ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>
          {order.trackingNumber && (
            <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 text-sm">
              <Truck className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Tracking:</span>
              {order.trackingUrl ? (
                <a href={order.trackingUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline font-medium">
                  {order.trackingNumber}
                </a>
              ) : (
                <span className="font-medium text-foreground">{order.trackingNumber}</span>
              )}
              {order.estimatedDelivery && (
                <span className="ml-auto flex items-center gap-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  Est. {new Date(order.estimatedDelivery).toLocaleDateString("en-IN")}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Cancelled */}
      {order.status === "cancelled" && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-800">Order Cancelled</p>
            {order.cancellationReason && <p className="text-xs text-red-700 mt-0.5">Reason: {order.cancellationReason}</p>}
            {order.cancelledAt && <p className="text-xs text-red-600 mt-0.5">On {new Date(order.cancelledAt).toLocaleDateString("en-IN")}</p>}
          </div>
        </div>
      )}

      {/* Items */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3.5 border-b border-border">
          <h3 className="font-heading font-semibold text-foreground text-sm">Order Items</h3>
        </div>
        <ul className="divide-y divide-border">
          {order.items.map((item, i) => (
            <li key={i} className="flex items-center gap-4 px-5 py-4">
              <div className="h-14 w-14 rounded-lg bg-muted border border-border overflow-hidden shrink-0 flex items-center justify-center">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">SKU: {item.sku} &middot; Qty: {item.quantity}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-foreground">₹{(item.total ?? 0).toLocaleString("en-IN")}</p>
                <p className="text-xs text-muted-foreground">₹{(item.price ?? 0).toLocaleString("en-IN")} each</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <div className="border-t border-border px-5 py-4 space-y-2 bg-muted/30">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Subtotal</span>
            <span>₹{(order.subtotal ?? 0).toLocaleString("en-IN")}</span>
          </div>
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Shipping</span>
            <span>{(order.shippingCost ?? 0) === 0 ? "Free" : `₹${(order.shippingCost ?? 0).toLocaleString("en-IN")}`}</span>
          </div>
          {(order.discount ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Discount</span>
              <span>-₹{(order.discount ?? 0).toLocaleString("en-IN")}</span>
            </div>
          )}
          {order.taxBreakdown ? (
            order.taxBreakdown.taxType === "INTRA" ? (
              <>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>CGST (9%)</span>
                  <span>₹{(order.taxBreakdown.cgst ?? 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>SGST (9%)</span>
                  <span>₹{(order.taxBreakdown.sgst ?? 0).toLocaleString("en-IN")}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>IGST (18%)</span>
                <span>₹{(order.taxBreakdown.igst ?? 0).toLocaleString("en-IN")}</span>
              </div>
            )
          ) : (order.tax ?? 0) > 0 && (
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Tax</span>
              <span>₹{(order.tax ?? 0).toLocaleString("en-IN")}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold text-foreground border-t border-border pt-2">
            <span>Total</span>
            <span>₹{(order.total ?? 0).toLocaleString("en-IN")}</span>
          </div>
        </div>
      </div>

      {/* Shipping + Payment */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-heading font-semibold text-foreground text-sm">Shipping Address</h3>
          </div>
          <div className="text-sm text-muted-foreground space-y-0.5 leading-relaxed">
            {order.shippingAddress ? (
              <>
                <p className="font-medium text-foreground">{order.shippingAddress.name}</p>
                <p>{order.shippingAddress.phone}</p>
                <p>{order.shippingAddress.address}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}</p>
              </>
            ) : (
              <p className="text-muted-foreground">Address not available</p>
            )}
          </div>
        </div>
        <div className="bg-card rounded-xl border border-border p-4">
          <div className="flex items-center gap-2 mb-3">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-heading font-semibold text-foreground text-sm">Payment</h3>
          </div>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Method</span>
              <span className="font-medium text-foreground capitalize">{order.paymentMethod ? order.paymentMethod.replace("_", " ") : "Unknown"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <span className={`font-medium capitalize ${order.paymentStatus === "paid" ? "text-green-600" : order.paymentStatus === "failed" ? "text-red-600" : "text-yellow-600"}`}>
                {order.paymentStatus}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel */}
      {canCancel && !showCancelConfirm && (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" className="border-destructive text-destructive hover:bg-destructive hover:text-white" onClick={() => setShowCancelConfirm(true)}>
            <XCircle className="h-4 w-4 mr-2" />
            Cancel Order
          </Button>
        </div>
      )}

      {showCancelConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-red-500" />
            <h3 className="font-semibold text-red-800">Cancel this order?</h3>
          </div>
          <textarea
            className="w-full border border-red-200 rounded-lg p-3 text-sm bg-white resize-none focus:outline-none focus:ring-1 focus:ring-red-400"
            placeholder="Reason for cancellation (optional)..."
            rows={2}
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => { setShowCancelConfirm(false); setCancelReason(""); }}
            >
              Keep Order
            </Button>
            <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white" onClick={handleCancel} disabled={cancelling}>
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Cancellation
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
