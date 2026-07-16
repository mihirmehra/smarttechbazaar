import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import {
  ArrowLeft,
  User,
  MapPin,
  Phone,
  Mail,
  Package,
  Truck,
  CreditCard,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import OrderStatusUpdater from "@/components/admin/OrderStatusUpdater";
import DeleteOrderButton from "@/components/admin/DeleteOrderButton";
import ViewInvoiceButton from "@/components/orders/ViewInvoiceButton";

interface OrderDetailPageProps {
  params: Promise<{ id: string }>;
}

async function getOrder(id: string) {
  try {
    await dbConnect();
    const order = await Order.findById(id)
      .populate("user", "name email phone avatar createdAt")
      .populate("items.product", "name images slug")
      .lean();

    if (!order) return null;
    return JSON.parse(JSON.stringify(order));
  } catch (error) {
    console.error("Error fetching order:", error);
    return null;
  }
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pending", color: "bg-stb-warning/10 text-stb-warning border-stb-warning", icon: Clock },
  confirmed: { label: "Confirmed", color: "bg-primary/10 text-primary border-primary", icon: CheckCircle },
  processing: { label: "Processing", color: "bg-accent/10 text-accent border-accent", icon: Package },
  shipped: { label: "Shipped", color: "bg-chart-4/10 text-chart-4 border-chart-4", icon: Truck },
  delivered: { label: "Delivered", color: "bg-stb-success/10 text-stb-success border-stb-success", icon: CheckCircle },
  cancelled: { label: "Cancelled", color: "bg-destructive/10 text-destructive border-destructive", icon: XCircle },
  returned: { label: "Returned", color: "bg-muted text-muted-foreground border-muted-foreground", icon: Package },
};

const paymentStatusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-stb-warning/10 text-stb-warning" },
  paid: { label: "Paid", color: "bg-stb-success/10 text-stb-success" },
  failed: { label: "Failed", color: "bg-destructive/10 text-destructive" },
  refunded: { label: "Refunded", color: "bg-muted text-muted-foreground" },
};

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  const session = await getServerSession(authOptions);
  const { id } = await params;
  const order = await getOrder(id);
  const isSuperAdmin = session?.user?.role === "super_admin";

  if (!order) {
    notFound();
  }

  const config = statusConfig[order.status] || statusConfig.pending;
  const paymentConfig = paymentStatusConfig[order.paymentStatus] || paymentStatusConfig.pending;
  const StatusIcon = config.icon;

  // Build timeline from statusHistory.
  // Use the FIRST occurrence of each status so that if an admin ever moves a status
  // backward and forward, the timeline shows when each step was first reached.
  // forEach with Map.set() overwrites duplicates, so we iterate in reverse and
  // then the first occurrence wins (last set in the reversed array = first in original).
  const statusHistoryMap = new Map<string, Date>();
  if (order.statusHistory && order.statusHistory.length > 0) {
    // Iterate in reverse so that earlier (first) entries overwrite later ones
    [...order.statusHistory]
      .reverse()
      .forEach((entry: { status: string; timestamp: string }) => {
        statusHistoryMap.set(entry.status, new Date(entry.timestamp));
      });
  }

  const statusTimeline = [
    { 
      status: "pending", 
      label: "Order Placed", 
      date: statusHistoryMap.get("pending") || order.createdAt 
    },
    { 
      status: "confirmed", 
      label: "Confirmed", 
      date: statusHistoryMap.get("confirmed") || null 
    },
    { 
      status: "processing", 
      label: "Processing", 
      date: statusHistoryMap.get("processing") || null 
    },
    { 
      status: "shipped", 
      label: "Shipped", 
      date: statusHistoryMap.get("shipped") || null 
    },
    { 
      status: "delivered", 
      label: "Delivered", 
      date: statusHistoryMap.get("delivered") || order.deliveredAt || null 
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/orders"
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="heading-xl">Order #{order.orderNumber}</h1>
              <Badge variant="secondary" className={config.color}>
                <StatusIcon className="mr-1 h-3 w-3" />
                {config.label}
              </Badge>
            </div>
            <p className="body-md mt-1 text-muted-foreground">
              Placed on {new Date(order.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <ViewInvoiceButton orderId={order._id} />
          <OrderStatusUpdater
            orderId={order._id}
            currentStatus={order.status}
            currentPaymentStatus={order.paymentStatus}
            trackingNumber={order.trackingNumber}
            trackingUrl={order.trackingUrl}
          />
          {isSuperAdmin && order.status === "cancelled" && (
            <DeleteOrderButton orderId={order._id} orderNumber={order.orderNumber} />
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order Items */}
          <div className="rounded-xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-6 py-4">
              <h2 className="heading-md">Order Items ({order.items.length})</h2>
            </div>
            <div className="divide-y divide-border">
              {order.items.map((item: {
                _id: string;
                product?: { _id: string; name: string; images?: string[]; slug: string };
                name: string;
                sku: string;
                image?: string;
                price: number;
                quantity: number;
                total: number;
              }, index: number) => (
                <div key={item._id || index} className="flex items-center gap-4 p-4">
                  <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">
                    {(item.image || item.product?.images?.[0]) ? (
                      <Image
                        src={item.image || item.product?.images?.[0] || ""}
                        alt={item.name}
                        width={64}
                        height={64}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.name}</p>
                    <p className="text-sm text-muted-foreground">SKU: {item.sku}</p>
                  </div>
                  <div className="text-center">
                    <p className="font-medium">₹{item.price.toLocaleString("en-IN")}</p>
                    <p className="text-sm text-muted-foreground">x {item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">₹{item.total.toLocaleString("en-IN")}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="border-t border-border bg-muted/30 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>₹{order.shippingCost.toLocaleString("en-IN")}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-stb-success">
                    <span>Discount</span>
                    <span>-₹{order.discount.toLocaleString("en-IN")}</span>
                  </div>
                )}
                {order.taxBreakdown ? (
                  <>
                    {order.taxBreakdown.taxType === "INTRA" ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CGST (9%)</span>
                          <span>₹{order.taxBreakdown.cgst.toLocaleString("en-IN")}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SGST (9%)</span>
                          <span>₹{order.taxBreakdown.sgst.toLocaleString("en-IN")}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IGST (18%)</span>
                        <span>₹{order.taxBreakdown.igst.toLocaleString("en-IN")}</span>
                      </div>
                    )}
                  </>
                ) : order.tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>₹{order.tax.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-border pt-2 text-lg font-bold">
                  <span>Total</span>
                  <span>₹{order.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Status Timeline */}
          {order.status !== "cancelled" && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="heading-md mb-4">Order Timeline</h2>
              <div className="relative">
                <div className="absolute left-4 top-0 h-full w-0.5 bg-border" />
                <div className="space-y-6">
                  {statusTimeline.map((step, index) => {
                    const isCompleted = step.date != null;
                    const isCurrent = step.status === order.status;

                    return (
                      <div key={step.status} className="relative flex items-start gap-4 pl-10">
                        <div
                          className={`absolute left-2 h-5 w-5 rounded-full border-2 ${
                            isCompleted
                              ? "border-stb-success bg-stb-success"
                              : isCurrent
                                ? "border-primary bg-primary"
                                : "border-border bg-background"
                          }`}
                        >
                          {isCompleted && (
                            <CheckCircle className="h-full w-full text-white p-0.5" />
                          )}
                        </div>
                        <div>
                          <p className={`font-medium ${isCompleted || isCurrent ? "text-foreground" : "text-muted-foreground"}`}>
                            {step.label}
                          </p>
                          {step.date && (
                            <p className="text-sm text-muted-foreground">
                              {new Date(step.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Cancellation Info */}
          {order.status === "cancelled" && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-6">
              <div className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <h3 className="font-semibold text-destructive">Order Cancelled</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {order.cancellationReason || "No reason provided"}
                  </p>
                  {order.cancelledAt && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Cancelled on {new Date(order.cancelledAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Info */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="heading-md mb-4">Customer</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span>{order.user?.name || order.shippingAddress.name}</span>
              </div>
              {order.user?.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${order.user.email}`} className="text-primary hover:underline">
                    {order.user.email}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a href={`tel:${order.shippingAddress.phone}`} className="text-primary hover:underline">
                  {order.shippingAddress.phone}
                </a>
              </div>
            </div>
          </div>

          {/* Shipping Address */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="heading-md mb-4">Shipping Address</h2>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-1" />
              {order.shippingAddress ? (
                <div className="text-sm">
                  <p className="font-medium">{order.shippingAddress.name}</p>
                  <p className="text-muted-foreground">{order.shippingAddress.address}</p>
                  <p className="text-muted-foreground">
                    {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                  </p>
                  <p className="text-muted-foreground mt-1">{order.shippingAddress.phone}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Address not available</p>
              )}
            </div>
          </div>

          {/* Payment Info */}
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <h2 className="heading-md mb-4">Payment</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Method</span>
                <span className="font-medium uppercase">{order.paymentMethod ? order.paymentMethod.replace("_", " ") : "Unknown"}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="secondary" className={paymentConfig.color}>
                  {paymentConfig.label}
                </Badge>
              </div>
              {order.couponCode && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Coupon</span>
                  <span className="font-mono text-sm">{order.couponCode}</span>
                </div>
              )}
              {order.taxBreakdown?.customerGstin && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Customer GSTIN</span>
                  <span className="font-mono text-xs">{order.taxBreakdown.customerGstin}</span>
                </div>
              )}
            </div>
          </div>

          {/* Tracking Info */}
          {order.trackingNumber && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="heading-md mb-4">Tracking</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Number</span>
                  <span className="font-mono text-sm">{order.trackingNumber}</span>
                </div>
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    Track Package
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
                {order.estimatedDelivery && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Est. delivery: {new Date(order.estimatedDelivery).toLocaleDateString("en-IN")}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notes */}
          {order.notes && (
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="heading-md mb-4">Notes</h2>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
