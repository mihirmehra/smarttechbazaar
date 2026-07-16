"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCart } from "@/components/providers/CartWishlistProvider";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Loader2, ChevronRight, ShieldCheck } from "lucide-react";
import { formatPrice, canSeeBothPrices } from "@/lib/pricing";

export default function CartPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { cart, cartTotal, isLoading, updateQuantity: providerUpdateQty, removeItem: providerRemoveItem } = useCart();
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());

  const items = cart?.items || [];
  const total = cartTotal ?? 0;
  const isB2B = cart?.isB2B || false;
  const isAdmin = canSeeBothPrices(session?.user?.role);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/cart");
    }
  }, [status, router]);

  const updateQuantity = async (productId: string, qty: number) => {
    setUpdatingItems((p) => new Set(p).add(productId));
    try { 
      const result = await providerUpdateQty(productId, qty);
      if (!result.success) {
        console.error("Update quantity failed:", result.error);
      }
    }
    finally { setUpdatingItems((p) => { const n = new Set(p); n.delete(productId); return n; }); }
  };

  const removeItem = async (productId: string) => {
    setUpdatingItems((p) => new Set(p).add(productId));
    try { 
      const result = await providerRemoveItem(productId);
      if (!result.success) {
        console.error("Remove item failed:", result.error);
      }
    }
    finally { setUpdatingItems((p) => { const n = new Set(p); n.delete(productId); return n; }); }
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex flex-1 items-center justify-center">
          <Loader2 className="h-7 w-7 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]">
      <Header />
      <main className="flex-1 pb-36 md:pb-0">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-white">
          <div className="mx-auto flex max-w-7xl items-center gap-1.5 px-3 py-2.5 md:px-4">
            <Link href="/" className="text-[11px] text-muted-foreground hover:text-primary">Home</Link>
            <ChevronRight className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] font-medium text-foreground">Cart</span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
          <h1 className="mb-4 text-base font-extrabold text-foreground md:mb-6 md:text-2xl">
            Shopping Cart
            {items.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">({items.length} items)</span>
            )}
          </h1>

          {items.length === 0 ? (
            /* ── Empty state ──────────────────────────────────────── */
            <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-white py-14 text-center shadow-sm">
              <ShoppingBag className="h-12 w-12 text-muted-foreground/40 md:h-16 md:w-16" />
              <h2 className="mt-4 text-sm font-bold text-foreground md:text-lg">Your cart is empty</h2>
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">Add items to get started</p>
              <Link
                href="/"
                className="mt-5 flex items-center gap-1.5 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-white hover:bg-stb-red-dark md:text-sm"
              >
                Continue Shopping <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-3 lg:gap-6">
              {/* ── Cart items ────────────────────────────────────── */}
              <div className="lg:col-span-2">
                <div className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                  {/* Header row */}
                  <div className="flex items-center justify-between border-b border-border px-4 py-3">
                    <span className="text-xs font-bold text-foreground md:text-sm">
                      {items.length} item{items.length !== 1 ? "s" : ""}
                    </span>
                    {isB2B && (
                      <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                        B2B Prices
                      </span>
                    )}
                  </div>

                  <div className="divide-y divide-border">
                    {items.map((item) => {
                      if (!item.product) return null;
                      const busy = updatingItems.has(item.product._id);
                      const itemPrice = Number(item.price) || 0;
                      const itemMrp = Number(item.product.mrp) || 0;
                      const itemTotal = Number(item.total) || 0;
                      const itemPriceB2B = Number(item.product.priceB2B) || 0;
                      const itemPriceB2C = Number(item.product.priceB2C) || 0;
                      const discount = itemMrp > itemPrice
                        ? Math.round(((itemMrp - itemPrice) / itemMrp) * 100)
                        : 0;
                      return (
                        <div key={item.product._id} className={`flex gap-3 p-3 md:gap-4 md:p-4 ${busy ? "opacity-60" : ""}`}>
                          {/* Image */}
                          <Link
                            href={`/product/${item.product.slug}`}
                            className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-border bg-muted md:h-20 md:w-20"
                          >
                            <Image
                              src={item.product.images?.[0] || "https://placehold.co/80x80?text=STB"}
                              alt={item.product.name}
                              width={80}
                              height={80}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          </Link>

                          {/* Info */}
                          <div className="flex flex-1 flex-col gap-1">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                {item.product.brand && (
                                  <span className="text-[9px] font-semibold uppercase tracking-wide text-primary md:text-[10px]">
                                    {item.product.brand}
                                  </span>
                                )}
                                <Link href={`/product/${item.product.slug}`}>
                                  <p className="line-clamp-2 text-[11px] font-medium leading-tight text-foreground hover:text-primary md:text-xs">
                                    {item.product.name}
                                  </p>
                                </Link>
                              </div>
                              <button
                                onClick={() => removeItem(item.product._id)}
                                disabled={busy}
                                className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground hover:bg-red-50 hover:text-destructive disabled:opacity-50 press-active"
                              >
                                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>

                            {/* Price + qty row — two stacked sub-rows on mobile */}
                            <div className="mt-auto flex min-w-0 flex-col gap-1.5">
                              {/* Unit price row */}
                              {isAdmin ? (
                                /* Admin view: show both prices */
                                <div className="flex flex-wrap items-baseline gap-2">
                                  <span className="text-[9px] font-semibold text-blue-700">B2B: {formatPrice(itemPriceB2B)}</span>
                                  <span className="text-[9px] font-semibold text-green-700">B2C: {formatPrice(itemPriceB2C)}</span>
                                </div>
                              ) : (
                                /* Customer view */
                                <div className="flex items-baseline gap-1.5">
                                  <span className="text-sm font-extrabold text-foreground md:text-base">
                                    {formatPrice(itemPrice)}
                                  </span>
                                  {discount > 0 && (
                                    <>
                                      <span className="text-[9px] text-muted-foreground line-through md:text-[10px]">
                                        {formatPrice(itemMrp)}
                                      </span>
                                      <span className="text-[9px] font-semibold text-stb-success">{discount}% off</span>
                                    </>
                                  )}
                                  {isB2B && (
                                    <span className="text-[8px] font-semibold text-blue-700 bg-blue-50 px-1 py-0.5 rounded">B2B</span>
                                  )}
                                </div>
                              )}
                              {/* Qty + line total row */}
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center overflow-hidden rounded-xl border border-border">
                                  <button
                                    onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                                    disabled={item.quantity <= 1 || busy}
                                    className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 press-active"
                                  >
                                    <Minus className="h-3 w-3" />
                                  </button>
                                  <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                                  <button
                                    onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                                    disabled={item.quantity >= item.product.stock || busy}
                                    className="flex h-7 w-7 items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 press-active"
                                  >
                                    <Plus className="h-3 w-3" />
                                  </button>
                                </div>
                                <span className="text-xs font-extrabold text-foreground md:text-sm">
                                  {formatPrice(itemTotal)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* ── Order summary — desktop only ─────────────────── */}
              <div className="hidden lg:block">
                <div className="sticky top-20 overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
                  <div className="border-b border-border px-4 py-3">
                    <span className="text-sm font-bold text-foreground">Order Summary</span>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal ({items.length} items)</span>
                      <span className="font-semibold">{formatPrice(total)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Delivery</span>
                      <span className="text-stb-success font-medium">Calculated at checkout</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax</span>
                      <span className="font-medium">Included</span>
                    </div>
                    <div className="border-t border-border pt-3 flex justify-between">
                      <span className="font-bold text-foreground">Total</span>
                      <span className="text-lg font-extrabold text-primary">{formatPrice(total)}</span>
                    </div>
                    <Link
                      href="/checkout"
                      className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-stb-red-dark"
                    >
                      Proceed to Checkout <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link href="/" className="block text-center text-xs text-muted-foreground hover:text-primary">
                      Continue Shopping
                    </Link>
                  </div>
                  {/* Trust row */}
                  <div className="border-t border-border px-4 py-3 flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-stb-success shrink-0" />
                    <span className="text-[10px] text-muted-foreground">Secure checkout · GST invoices available</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── Sticky mobile checkout bar ──────────────────────────────── */}
      {items.length > 0 && (
        <div
          className="fixed left-0 right-0 z-40 flex items-center justify-between gap-3 border-t border-border bg-white px-4 py-3 shadow-xl animate-slide-up md:hidden"
          style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
        >
          <div>
            <p className="text-[10px] text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""}{isB2B ? " (B2B)" : ""}</p>
            <p className="text-base font-extrabold text-foreground">{formatPrice(total)}</p>
          </div>
          <Link
            href="/checkout"
            className="flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-white hover:bg-stb-red-dark press-active"
          >
            Checkout <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <Footer />
    </div>
  );
}
