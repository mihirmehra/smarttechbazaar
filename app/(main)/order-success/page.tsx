import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Order from "@/models/Order";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle, 
  Package, 
  Home, 
  FileText, 
  Truck, 
  CreditCard,
  MapPin,
  Clock,
  Download
} from "lucide-react";

interface OrderSuccessPageProps {
  searchParams: Promise<{ orderId?: string; orderNumber?: string }>;
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface OrderData {
  _id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  razorpayPaymentId?: string;
  items: OrderItem[];
  shippingAddress: {
    name: string;
    city: string;
    state: string;
  };
  subtotal: number;
  shippingCost: number;
  tax: number;
  total: number;
  createdAt: string;
}

async function getOrderData(orderId: string, userId: string): Promise<OrderData | null> {
  try {
    await dbConnect();
    
    const order = await Order.findOne({
      _id: orderId,
      user: userId,
    }).lean();

    if (!order) return null;

    return JSON.parse(JSON.stringify(order));
  } catch {
    return null;
  }
}

export default async function OrderSuccessPage({
  searchParams,
}: OrderSuccessPageProps) {
  const { orderId, orderNumber } = await searchParams;
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login?redirect=/order-success");
  }

  // Fetch order details if orderId is provided
  let order: OrderData | null = null;
  if (orderId) {
    order = await getOrderData(orderId, session.user.id);
  }

  // Calculate estimated delivery (5 business days)
  const estimatedDelivery = new Date();
  estimatedDelivery.setDate(estimatedDelivery.getDate() + 5);
  const estimatedDeliveryStr = estimatedDelivery.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background px-4 py-6 pb-24 sm:py-10 sm:pb-10">
        <div className="mx-auto max-w-2xl">
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
              {order?.paymentStatus === "paid" ? "Payment Successful!" : "Order Placed!"}
            </h1>
            <p className="body-lg mt-3 text-muted-foreground">
              {order?.paymentStatus === "paid" 
                ? "Your payment has been confirmed and your order is being processed."
                : "Thank you for your order. We've received it and will begin processing soon."}
            </p>
          </div>

          {/* Order Number Card */}
          <div className="bg-card rounded-xl border border-border p-6 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Order Number</p>
                <p className="font-mono text-xl font-bold text-foreground">
                  {order?.orderNumber || orderNumber || orderId?.slice(-8).toUpperCase()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {order?.paymentStatus === "paid" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-sm font-medium">
                    <CreditCard className="h-4 w-4" />
                    Paid
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-100 text-blue-700 text-sm font-medium capitalize">
                  <Package className="h-4 w-4" />
                  {order?.status || "Confirmed"}
                </span>
              </div>
            </div>

            {/* Payment Details */}
            {order?.razorpayPaymentId && (
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm text-muted-foreground">
                  Payment ID: <span className="font-mono text-foreground">{order.razorpayPaymentId}</span>
                </p>
              </div>
            )}
          </div>

          {/* Order Summary */}
          {order && (
            <div className="bg-card rounded-xl border border-border overflow-hidden mb-6">
              <div className="px-6 py-4 border-b border-border">
                <h2 className="font-semibold text-foreground">Order Summary</h2>
              </div>
              
              {/* Items */}
              <div className="divide-y divide-border">
                {order.items.slice(0, 3).map((item: OrderItem, index: number) => (
                  <div key={index} className="px-6 py-3 flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-medium text-foreground">
                      Rs. {(item.total ?? 0).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
                {order.items.length > 3 && (
                  <div className="px-6 py-2 text-sm text-muted-foreground">
                    +{order.items.length - 3} more item(s)
                  </div>
                )}
              </div>

              {/* Totals */}
              <div className="bg-muted/30 px-6 py-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="text-foreground">Rs. {(order.subtotal ?? 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Shipping</span>
                  <span className="text-foreground">
                    {(order.shippingCost ?? 0) === 0 ? "Free" : `Rs. ${(order.shippingCost ?? 0).toLocaleString("en-IN")}`}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="text-foreground">Rs. {(order.tax ?? 0).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
                  <span className="text-foreground">Total</span>
                  <span className="text-primary">Rs. {(order.total ?? 0).toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Info Cards */}
          <div className="grid sm:grid-cols-2 gap-4 mb-6">
            {/* Estimated Delivery */}
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-100">
                <Truck className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Estimated Delivery</h3>
                <p className="text-sm text-muted-foreground">{estimatedDeliveryStr}</p>
              </div>
            </div>

            {/* Shipping To */}
            {order?.shippingAddress && (
              <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
                  <MapPin className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Shipping To</h3>
                  <p className="text-sm text-muted-foreground">
                    {order.shippingAddress
                      ? `${order.shippingAddress.name}, ${order.shippingAddress.city}`
                      : "Address not available"}
                  </p>
                </div>
              </div>
            )}

            {/* Order Confirmation */}
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Confirmation Email</h3>
                <p className="text-sm text-muted-foreground">
                  Sent to your registered email
                </p>
              </div>
            </div>

            {/* Next Steps */}
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="font-medium text-foreground">Next Steps</h3>
                <p className="text-sm text-muted-foreground">
                  We&apos;ll notify you when shipped
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid sm:grid-cols-2 gap-3 mb-6">
            <Link href={orderId ? `/dashboard/orders/${orderId}` : "/dashboard/orders"}>
              <Button className="w-full gap-2" size="lg">
                <Package className="h-4 w-4" />
                Track Your Order
              </Button>
            </Link>
            {orderId && order?.paymentStatus === "paid" && (
              <Link href={`/dashboard/orders/${orderId}/invoice`}>
                <Button variant="outline" className="w-full gap-2" size="lg">
                  <FileText className="h-4 w-4" />
                  View Invoice
                </Button>
              </Link>
            )}
          </div>

          {/* Download Invoice Button */}
          {orderId && order?.paymentStatus === "paid" && (
            <div className="bg-muted/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-foreground">Download Invoice</p>
                    <p className="text-sm text-muted-foreground">Get your GST-compliant tax invoice</p>
                  </div>
                </div>
                <a href={`/api/orders/${orderId}/invoice/pdf`} download>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-4 w-4" />
                    Download PDF
                  </Button>
                </a>
              </div>
            </div>
          )}

          {/* Continue Shopping */}
          <div className="text-center">
            <Link href="/">
              <Button variant="ghost" className="gap-2">
                <Home className="h-4 w-4" />
                Continue Shopping
              </Button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
