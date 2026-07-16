"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { OfflineAlert } from "@/components/ui/offline-alert";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { isRunningInMobileApp, getMobilePlatform, vibrate } from "@/lib/mobile-utils";
import { formatPrice, canSeeBothPrices } from "@/lib/pricing";
import {
  ChevronRight,
  Loader2,
  MapPin,
  CreditCard,
  Truck,
  ShieldCheck,
  Plus,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

// Razorpay types
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
  notes?: Record<string, string>;
  theme: {
    color: string;
  };
  handler: (response: RazorpayResponse) => void;
  modal?: {
    ondismiss?: () => void;
    escape?: boolean;
    animation?: boolean;
    confirm_close?: boolean;
  };
  retry?: {
    enabled: boolean;
    max_count?: number;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: RazorpayErrorResponse) => void) => void;
  close: () => void;
}

interface RazorpayErrorResponse {
  error: {
    code: string;
    description: string;
    source: string;
    step: string;
    reason: string;
    metadata: {
      order_id: string;
      payment_id: string;
    };
  };
}

interface RazorpayResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface CartItem {
  product: {
    _id: string;
    name: string;
    slug: string;
    images?: string[];
    priceB2C: number;
    priceB2B: number;
    stock: number;
  };
  quantity: number;
  price: number;
  total: number;
}

interface Address {
  _id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  isDefault: boolean;
}

interface TaxBreakdown {
  taxType: "INTRA" | "INTER";
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
  customerState: string;
  isIntraState: boolean;
  customerGstin?: string | null;
}

interface PaymentOrderResponse {
  success: boolean;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  breakdown: {
    items: Array<{
      productId: string;
      name: string;
      price: number;
      quantity: number;
      total: number;
    }>;
    subtotal: number;
    shippingCost: number;
    discount: number;
    taxBreakdown: TaxBreakdown;
    total: number;
  };
  prefill: {
    name: string;
    email: string;
    contact: string;
  };
}

export default function CheckoutPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [shippingCost, setShippingCost] = useState(99);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [razorpayLoaded, setRazorpayLoaded] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Payment failure states
  const [paymentFailed, setPaymentFailed] = useState(false);
  const [failedOrderId, setFailedOrderId] = useState<string | null>(null);
  const [paymentAttempts, setPaymentAttempts] = useState(0);
  const [isB2B, setIsB2B] = useState(false);

  // Check if user is admin (can see both prices)
  const isAdmin = canSeeBothPrices(session?.user?.role);

  // Tax breakdown state
  const [taxBreakdown, setTaxBreakdown] = useState<TaxBreakdown | null>(null);
  const [isCalculatingTax, setIsCalculatingTax] = useState(false);

  // Mobile app detection
  const { isOnline } = useNetworkStatus();
  const [isMobileApp, setIsMobileApp] = useState(false);
  const [mobilePlatform, setMobilePlatform] = useState<"ios" | "android" | "web">("web");

  useEffect(() => {
    setIsMobileApp(isRunningInMobileApp());
    setMobilePlatform(getMobilePlatform());
  }, []);

  const [newAddress, setNewAddress] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/checkout");
      return;
    }

    if (status === "authenticated") {
      fetchCart();
      fetchSavedAddresses();
    }
  }, [status, router]);

  // Calculate tax when address changes (lightweight endpoint, no Razorpay order created)
  const calculateTax = useCallback(async (address: Address) => {
    if (!address || items.length === 0) return;

    setIsCalculatingTax(true);
    try {
      const response = await fetch("/api/payment/calculate-tax", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.product._id,
            quantity: item.quantity,
          })),
          shippingAddress: {
            state: address.state,
          },
        }),
      });

      const data = await response.json();

      if (data.success && data.breakdown) {
        setTaxBreakdown(data.breakdown.taxBreakdown);
        setShippingCost(data.breakdown.shippingCost);
        setIsB2B(data.breakdown.isB2B || false);
      }
    } catch (error) {
      console.error("Error calculating tax:", error);
    } finally {
      setIsCalculatingTax(false);
    }
  }, [items]);

  // Recalculate tax when address or items change
  useEffect(() => {
    if (selectedAddress && items.length > 0) {
      calculateTax(selectedAddress);
    }
  }, [selectedAddress, calculateTax]);

  const fetchCart = async () => {
    try {
      const response = await fetch("/api/cart");
      const data = await response.json();

      if (!data.items || data.items.length === 0) {
        router.push("/cart");
        return;
      }

      setItems(data.items);
      // Ensure total is a valid number, fallback to 0 if null/undefined
      const cartTotal = Number(data.total) || 0;
      setTotal(cartTotal);
      setIsB2B(data.isB2B || false);

      // Set shipping based on total
      if (cartTotal >= 5000) {
        setShippingCost(0);
      }
    } catch (error) {
      console.error("Error fetching cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchSavedAddresses = async () => {
    try {
      const res = await fetch("/api/user/addresses");
      const data = await res.json();
      if (data.addresses && data.addresses.length > 0) {
        setSavedAddresses(data.addresses);
        // Pre-select the primary address
        const primary = data.addresses.find((a: Address) => a.isDefault) || data.addresses[0];
        setSelectedAddress(primary);
      } else {
        // No saved addresses, show the form
        setShowAddressForm(true);
      }
    } catch {
      setShowAddressForm(true);
    }
  };

  const handleAddressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewAddress((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSaveAddress = () => {
    if (
      !newAddress.name ||
      !newAddress.phone ||
      !newAddress.address ||
      !newAddress.city ||
      !newAddress.state ||
      !newAddress.pincode
    ) {
      alert("Please fill all address fields");
      return;
    }

    const addr: Address = { _id: "new", ...newAddress, isDefault: false };
    setSelectedAddress(addr);
    setShowAddressForm(false);
  };

  const initiateRazorpayPayment = async (retryOrderId?: string) => {
    if (!selectedAddress) {
      setOrderError("Please add a delivery address");
      vibrate(100); // Haptic feedback on error
      return;
    }

    // Check network connectivity (essential for mobile apps)
    if (!isOnline) {
      setOrderError("You're offline. Please check your internet connection and try again.");
      vibrate([50, 100, 50]); // Haptic pattern for error
      return;
    }

    if (!razorpayLoaded) {
      setOrderError("Payment system is loading. Please try again.");
      return;
    }

    // Check max payment attempts
    if (paymentAttempts >= 5) {
      setOrderError("Maximum payment attempts reached. Please try again later or contact support.");
      return;
    }

    setIsPlacingOrder(true);
    setOrderError(null);
    setPaymentFailed(false);

    try {
      let orderData: PaymentOrderResponse;

      // If retrying, use existing order ID if available
      if (retryOrderId && failedOrderId === retryOrderId) {
        // For retry, we still need to create a new order to get fresh credentials
        // Razorpay orders can't be reused after failure
      }

      // Step 1: Create Razorpay order on server
      const createOrderResponse = await fetch("/api/payment/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(item => ({
            productId: item.product._id,
            quantity: item.quantity,
          })),
          shippingAddress: {
            name: selectedAddress.name,
            phone: selectedAddress.phone,
            address: selectedAddress.address,
            city: selectedAddress.city,
            state: selectedAddress.state,
            pincode: selectedAddress.pincode,
          },
        }),
      });

      orderData = await createOrderResponse.json();

      if (!createOrderResponse.ok || !orderData.success) {
        throw new Error((orderData as unknown as { error: string }).error || "Failed to create payment order");
      }

      // Store order ID for potential retry
      setFailedOrderId(orderData.orderId);

      // Step 2: Open Razorpay checkout with enhanced options
      const options: RazorpayOptions = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SmartTechBazar",
        description: "Order Payment",
        order_id: orderData.orderId,
        prefill: {
          name: orderData.prefill.name,
          email: orderData.prefill.email || "",
          contact: orderData.prefill.contact,
        },
        theme: {
          color: "#FF6B00", // Primary brand color
        },
        // Enable retry within Razorpay modal
        retry: {
          enabled: true,
          max_count: 3,
        },
        modal: {
          ondismiss: function () {
            // User closed the payment modal
            setIsPlacingOrder(false);
            setOrderError("Payment was cancelled. You can try again when ready.");
          },
          escape: true,
          animation: true,
          confirm_close: true,
        },
        handler: async function (response: RazorpayResponse) {
          // Step 3: Verify payment on server
          try {
            const verifyResponse = await fetch("/api/payment/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                shippingAddress: {
                  name: selectedAddress.name,
                  phone: selectedAddress.phone,
                  address: selectedAddress.address,
                  city: selectedAddress.city,
                  state: selectedAddress.state,
                  pincode: selectedAddress.pincode,
                },
                items: items.map(item => ({
                  productId: item.product._id,
                  quantity: item.quantity,
                })),
              }),
            });

            const verifyData = await verifyResponse.json();

            if (verifyResponse.ok && verifyData.success) {
              // Payment successful - clear failure states and redirect
              setPaymentFailed(false);
              setPaymentAttempts(0);
              setFailedOrderId(null);
              router.push(`/order-success?orderId=${verifyData.orderId}&orderNumber=${verifyData.orderNumber}`);
            } else {
              // Verification failed - this is a serious issue
              setOrderError(verifyData.error || "Payment verification failed. If amount was deducted, please contact support with Order ID: " + response.razorpay_order_id);
              setPaymentFailed(true);
              setIsPlacingOrder(false);
            }
          } catch (verifyError) {
            console.error("Verification exception:", verifyError);
            setOrderError("Payment verification failed. Please contact support if amount was deducted. Order ID: " + response.razorpay_order_id);
            setPaymentFailed(true);
            setIsPlacingOrder(false);
          }
        },
      };

      const razorpay = new window.Razorpay(options);

      // Handle payment failures with detailed error tracking
      razorpay.on("payment.failed", async function (response: RazorpayErrorResponse) {
        console.error("Payment failed:", response.error);

        // Increment attempt count
        setPaymentAttempts(prev => prev + 1);
        setPaymentFailed(true);
        setIsPlacingOrder(false);

        // Log failure to backend for analytics
        try {
          const failureResponse = await fetch("/api/payment/failed", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              razorpay_order_id: orderData.orderId,
              error: response.error,
            }),
          });

          const failureData = await failureResponse.json();

          // Show user-friendly error message
          const errorMessage = failureData.userMessage || getPaymentErrorMessage(response.error);
          setOrderError(errorMessage);

          // Check if user can retry
          if (!failureData.canRetry) {
            setOrderError("Maximum payment attempts reached. Please try again later or use a different payment method.");
          }
        } catch {
          // Even if logging fails, show error to user
          setOrderError(getPaymentErrorMessage(response.error));
        }
      });

      razorpay.open();

    } catch (error) {
      console.error("Payment error:", error);
      setOrderError(error instanceof Error ? error.message : "Failed to initiate payment. Please try again.");
      setPaymentFailed(true);
      setIsPlacingOrder(false);
    }
  };

  // Helper function to get user-friendly error messages
  const getPaymentErrorMessage = (error: RazorpayErrorResponse["error"]): string => {
    const errorMessages: Record<string, string> = {
      "BAD_REQUEST_ERROR": "There was an issue with the payment. Please try again.",
      "GATEWAY_ERROR": "Bank gateway is temporarily unavailable. Please try again in a few minutes.",
      "NETWORK_ERROR": "Network issue detected. Please check your internet and try again.",
    };

    // Check for specific codes
    if (error.code && errorMessages[error.code]) {
      return errorMessages[error.code];
    }

    // Check reason for common patterns
    if (error.reason) {
      const reason = error.reason.toLowerCase();
      if (reason.includes("cancel")) return "Payment was cancelled. You can retry when ready.";
      if (reason.includes("timeout")) return "Payment timed out. Please try again.";
      if (reason.includes("declined")) return "Payment was declined. Please try a different method.";
      if (reason.includes("insufficient")) return "Insufficient funds. Please try another card.";
    }

    // Default with description if available
    return error.description || "Payment failed. Please try again or use a different payment method.";
  };

  const handlePlaceOrder = () => {
    initiateRazorpayPayment();
  };

  // Retry payment with same cart
  const handleRetryPayment = () => {
    setOrderError(null);
    setPaymentFailed(false);
    initiateRazorpayPayment(failedOrderId || undefined);
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  // Calculate totals including tax - ensure all values are valid numbers
  const safeTotal = total ?? 0;
  const taxAmount = taxBreakdown?.totalTax ?? 0;
  const grandTotal = safeTotal + shippingCost + taxAmount;

  return (
    <div className="flex min-h-screen flex-col">
      {/* Offline Alert for Mobile Apps */}
      <OfflineAlert onRetry={() => window.location.reload()} />

      {/* Load Razorpay Script */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        onLoad={() => setRazorpayLoaded(true)}
        strategy="lazyOnload"
      />

      <Header />
      <main className="flex-1 bg-background pb-32 md:pb-0">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-3 py-2.5 text-xs md:gap-2 md:px-4 md:py-3 md:text-sm">
            <Link href="/" className="text-muted-foreground hover:text-primary">
              Home
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground md:h-4 md:w-4" />
            <Link
              href="/cart"
              className="text-muted-foreground hover:text-primary"
            >
              Cart
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground md:h-4 md:w-4" />
            <span className="text-foreground">Checkout</span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-8">
          <h1 className="heading-xl mb-4 md:mb-8">Checkout</h1>

          {/* Error Alert */}
          {orderError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-red-800 md:mb-6 md:p-4">
              <div className="flex items-start gap-2.5 md:gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 md:h-5 md:w-5" />
                <div className="flex-1">
                  <p className="text-xs md:text-sm">{orderError}</p>
                  {paymentFailed && paymentAttempts < 5 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        onClick={handleRetryPayment}
                        variant="destructive"
                        size="sm"
                        className="gap-1.5"
                        disabled={isPlacingOrder}
                      >
                        {isPlacingOrder ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <CreditCard className="h-3.5 w-3.5" />
                        )}
                        Retry Payment
                      </Button>
                    </div>
                  )}
                  {paymentAttempts > 0 && paymentAttempts < 5 && (
                    <p className="mt-2 text-[10px] text-red-600">
                      Attempt {paymentAttempts} of 5
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setOrderError(null);
                    setPaymentFailed(false);
                  }}
                  className="shrink-0 text-red-600 hover:text-red-800"
                >
                  <span className="text-xs">Dismiss</span>
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-8 lg:grid-cols-3">
            {/* Checkout Form */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              {/* Delivery Address */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <h2 className="heading-md">Delivery Address</h2>
                </div>

                {/* Saved addresses */}
                {savedAddresses.length > 0 && !showAddressForm && (
                  <div className="space-y-2 mb-4">
                    {savedAddresses.map((addr) => (
                      <label
                        key={addr._id}
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors md:p-4 ${selectedAddress?._id === addr._id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted/50"
                          }`}
                      >
                        <input
                          type="radio"
                          name="address"
                          checked={selectedAddress?._id === addr._id}
                          onChange={() => setSelectedAddress(addr)}
                          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <p className="text-sm font-medium">{addr.name}</p>
                            {addr.isDefault && (
                              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                                Primary
                              </span>
                            )}
                          </div>
                          <p className="body-sm text-muted-foreground">{addr.phone}</p>
                          <p className="body-sm mt-0.5 break-words text-muted-foreground">
                            {addr.address}, {addr.city}, {addr.state} - {addr.pincode}
                          </p>
                        </div>
                      </label>
                    ))}
                    <button
                      onClick={() => { setShowAddressForm(true); setSelectedAddress(null); }}
                      className="flex items-center gap-2 text-sm text-primary hover:underline mt-1"
                    >
                      <Plus className="h-4 w-4" />
                      Use a different address
                    </button>
                  </div>
                )}

                {/* Display selected new address (when no saved addresses or user entered new address) */}
                {selectedAddress && selectedAddress._id === "new" && !showAddressForm && (
                  <div className="space-y-3 mb-4">
                    <div className="rounded-lg border border-primary bg-primary/5 p-3 md:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            <p className="text-sm font-medium">{selectedAddress.name}</p>
                          </div>
                          <p className="body-sm text-muted-foreground mt-1">{selectedAddress.phone}</p>
                          <p className="body-sm mt-0.5 break-words text-muted-foreground">
                            {selectedAddress.address}, {selectedAddress.city}, {selectedAddress.state} - {selectedAddress.pincode}
                          </p>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowAddressForm(true);
                        setNewAddress({
                          name: selectedAddress.name,
                          phone: selectedAddress.phone,
                          address: selectedAddress.address,
                          city: selectedAddress.city,
                          state: selectedAddress.state,
                          pincode: selectedAddress.pincode,
                        });
                      }}
                      className="flex items-center gap-2 text-sm text-primary hover:underline"
                    >
                      <MapPin className="h-4 w-4" />
                      Edit or change address
                    </button>
                  </div>
                )}

                {/* New address form */}
                {showAddressForm && (
                  <div className="space-y-4">
                    {savedAddresses.length > 0 && (
                      <button
                        onClick={() => { setShowAddressForm(false); setSelectedAddress(savedAddresses.find((a) => a.isDefault) || savedAddresses[0]); }}
                        className="text-sm text-primary hover:underline"
                      >
                        Use saved address
                      </button>
                    )}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="body-sm mb-1.5 block font-medium">Full Name</label>
                        <Input
                          name="name"
                          value={newAddress.name}
                          onChange={handleAddressChange}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <label className="body-sm mb-1.5 block font-medium">Phone Number</label>
                        <Input
                          name="phone"
                          value={newAddress.phone}
                          onChange={handleAddressChange}
                          placeholder="Enter phone number"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="body-sm mb-1.5 block font-medium">Address</label>
                      <Input
                        name="address"
                        value={newAddress.address}
                        onChange={handleAddressChange}
                        placeholder="House no., Building, Street, Area"
                      />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      <div>
                        <label className="body-sm mb-1.5 block font-medium">City</label>
                        <Input
                          name="city"
                          value={newAddress.city}
                          onChange={handleAddressChange}
                          placeholder="City"
                        />
                      </div>
                      <div>
                        <label className="body-sm mb-1.5 block font-medium">State</label>
                        <Input
                          name="state"
                          value={newAddress.state}
                          onChange={handleAddressChange}
                          placeholder="State"
                        />
                      </div>
                      <div>
                        <label className="body-sm mb-1.5 block font-medium">Pincode</label>
                        <Input
                          name="pincode"
                          value={newAddress.pincode}
                          onChange={handleAddressChange}
                          placeholder="Pincode"
                        />
                      </div>
                    </div>

                    <Button onClick={handleSaveAddress} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Use This Address
                    </Button>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="rounded-xl border border-border bg-card p-4 shadow-sm md:p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
                    <CreditCard className="h-4 w-4" />
                  </div>
                  <h2 className="heading-md">Payment Method</h2>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-4 rounded-lg border border-primary bg-primary/5 p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                      <CreditCard className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">Pay Online (Razorpay)</p>
                        <span className="text-[10px] font-semibold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">
                          Secure
                        </span>
                      </div>
                      <p className="body-sm text-muted-foreground">
                        UPI, Cards, Net Banking, Wallets
                      </p>
                    </div>
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div>
              <div className="sticky top-24 rounded-xl border border-border bg-card p-6 shadow-sm">
                <h2 className="heading-md mb-4">Order Summary</h2>

                {/* Items Preview */}
                <div className="mb-4 max-h-48 space-y-3 overflow-y-auto">
                  {items.map((item) => (
                    <div
                      key={item.product._id}
                      className="flex items-center gap-3"
                    >
                      <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                        <Image
                          src={
                            item.product.images?.[0] ||
                            "https://via.placeholder.com/50"
                          }
                          alt={item.product.name}
                          width={48}
                          height={48}
                          className="h-full w-full object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="flex-1">
                        <p className="body-sm line-clamp-1 font-medium">
                          {item.product.name}
                        </p>
                        <p className="body-sm text-muted-foreground">
                          Qty: {item.quantity}
                        </p>
                      </div>
                      <span className="body-sm font-medium">
                        {formatPrice(item.total ?? 0)}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Totals */}
                <div className="flex flex-col gap-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">
                      {formatPrice(total ?? 0)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Shipping</span>
                    <span
                      className={
                        shippingCost === 0 ? "text-stb-success" : "font-medium"
                      }
                    >
                      {shippingCost === 0
                        ? "FREE"
                        : formatPrice(shippingCost)}
                    </span>
                  </div>

                  {/* Admin View Indicator */}
                  {isAdmin && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50 p-2.5">
                      <div className="flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-medium text-purple-700">
                          Admin View - Showing {isB2B ? "B2B" : "B2C"} Prices
                        </span>
                      </div>
                    </div>
                  )}

                  {/* B2B Pricing Indicator */}
                  {isB2B && !isAdmin && (
                    <div className="rounded-lg border border-green-200 bg-green-50 p-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                        <span className="text-xs font-medium text-green-700">
                          B2B Wholesale Pricing Applied
                        </span>
                      </div>
                      {taxBreakdown?.customerGstin && (
                        <p className="mt-1 text-[10px] text-green-600">
                          GSTIN: {taxBreakdown.customerGstin}
                        </p>
                      )}
                    </div>
                  )}

                  {/* GST Breakdown */}
                  {taxBreakdown && (
                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          GST ({taxBreakdown.taxType === "INTRA" ? "Intra-State" : "Inter-State"})
                        </span>
                        {taxBreakdown.customerState && (
                          <span className="text-xs text-muted-foreground">
                            {taxBreakdown.customerState}
                          </span>
                        )}
                      </div>

                      {taxBreakdown.isIntraState ? (
                        <>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">CGST @9%</span>
                            <span>₹{taxBreakdown.cgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">SGST @9%</span>
                            <span>₹{taxBreakdown.sgst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      ) : (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">IGST @18%</span>
                          <span>₹{taxBreakdown.igst.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}

                      <div className="flex justify-between text-sm font-medium border-t border-border pt-2">
                        <span>Total Tax</span>
                        <span>₹{taxBreakdown.totalTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}

                  {isCalculatingTax && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Calculating tax...
                    </div>
                  )}

                  {(total ?? 0) < 5000 && (
                    <p className="body-sm text-muted-foreground">
                    </p>
                  )}
                </div>

                <Separator className="my-4" />

                <div className="flex justify-between text-lg">
                  <span className="font-medium">Total</span>
                  <span className="font-bold text-primary">
                    ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={!selectedAddress || isPlacingOrder || isCalculatingTax}
                  className="mt-6 w-full gap-2"
                  size="lg"
                >
                  {isPlacingOrder ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay Now
                      <ChevronRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Trust Badges */}
                <div className="mt-6 flex flex-col gap-3 text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <ShieldCheck className="h-4 w-4 text-stb-success" />
                    Secure checkout with Razorpay
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-stb-success" />
                    GST Invoice included
                  </div>
                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Truck className="h-4 w-4 text-primary" />
                    Fast delivery in 2-5 days
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ── Sticky mobile place-order bar ──────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-white px-4 py-3 shadow-xl md:hidden"
        style={{ bottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="min-w-0">
          <p className="text-[10px] text-muted-foreground">
            {isCalculatingTax ? "Calculating..." : `${items.length} item${items.length !== 1 ? "s" : ""}`}
          </p>
          <p className="text-base font-extrabold text-foreground">
            ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
        </div>
        <Button
          onClick={handlePlaceOrder}
          disabled={!selectedAddress || isPlacingOrder || isCalculatingTax}
          className="shrink-0 gap-2 press-active"
          size="default"
        >
          {isPlacingOrder ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              Pay Now
              <ChevronRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </div>

      <Footer />
    </div>
  );
}
