"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCart, useWishlist } from "@/components/providers/CartWishlistProvider";
import {
  Heart,
  ShoppingCart,
  Share2,
  Truck,
  Shield,
  RotateCcw,
  Minus,
  Plus,
  Check,
  Loader2,
  Zap,
} from "lucide-react";
import { getPricingInfo, formatPrice } from "@/lib/pricing";

interface ProductInfoProps {
  product: {
    _id: string;
    name: string;
    slug: string;
    shortDescription?: string;
    sku: string;
    brand?: string;
    priceB2C: number;
    priceB2B: number;
    mrp: number;
    stock: number;
    minOrderQty: number;
    maxOrderQty?: number;
    unit: string;
    tags?: string[];
    isFeatured?: boolean;
    isNewArrival?: boolean;
    isBestSeller?: boolean;
    views?: number;
    soldCount?: number;
  };
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addToCart: addToCartCtx } = useCart();
  const { isInWishlist, toggle: toggleWishlist, isLoading: wishlistLoading } = useWishlist();

  const [qty, setQty] = useState(product.minOrderQty || 1);
  const [addingCart, setAddingCart] = useState(false);
  const [cartAdded, setCartAdded] = useState(false);

  // Use centralized pricing logic
  const pricing = getPricingInfo(product, session);
  const { displayPrice: price, mrp, discount, savings, isB2B, canSeeBothPrices, priceB2B, priceB2C } = pricing;
  
  const inStock = (Number(product.stock) || 0) > 0;
  const wishlisted = isInWishlist(product._id);
  const totalPrice = price * qty;

  const changeQty = (d: number) => {
    const next = qty + d;
    const min = product.minOrderQty || 1;
    if (next < min) return;
    if (product.maxOrderQty && next > product.maxOrderQty) return;
    if (next > product.stock) return;
    setQty(next);
  };

  const handleAddToCart = async () => {
    if (!session) { router.push(`/auth/login?callbackUrl=/product/${product.slug}`); return; }
    setAddingCart(true);
    try {
      await addToCartCtx(product._id, qty);
      setCartAdded(true);
      setTimeout(() => setCartAdded(false), 2000);
    } finally {
      setAddingCart(false);
    }
  };

  const handleBuyNow = async () => {
    if (!session) { router.push(`/auth/login?callbackUrl=/product/${product.slug}`); return; }
    await handleAddToCart();
    router.push("/checkout");
  };

  const handleWishlist = async () => {
    if (!session) { router.push(`/auth/login?callbackUrl=/product/${product.slug}`); return; }
    await toggleWishlist(product._id);
  };

  const handleShare = async () => {
    if (navigator.share) {
      await navigator.share({ title: product.name, url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <div className="flex flex-col gap-3 md:gap-4">
      {/* ── Status badges ──────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        {product.isNewArrival && (
          <span className="rounded-full bg-stb-success px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white md:text-[10px]">New Arrival</span>
        )}
        {product.isBestSeller && (
          <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white md:text-[10px]">Best Seller</span>
        )}
        {discount > 0 && (
          <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white md:text-[10px]">{discount}% OFF</span>
        )}
      </div>

      {/* Brand + SKU */}
      <div className="flex items-center justify-between">
        {product.brand && (
          <span className="text-[11px] font-bold uppercase tracking-wide text-primary md:text-xs">{product.brand}</span>
        )}
        <span className="text-[10px] text-muted-foreground md:text-[11px]">SKU: {product.sku}</span>
      </div>

      {/* Name */}
      <h1 className="text-base font-extrabold leading-tight text-foreground md:text-2xl">{product.name}</h1>

      {/* Short description */}
      {product.shortDescription && (
        <p className="text-[11px] leading-relaxed text-muted-foreground md:text-sm">{product.shortDescription}</p>
      )}

      {/* ── Price block ─────────────────────────────────────────────── */}
      <div className="rounded-xl border border-border bg-[#FAFAFA] p-3 md:p-4">
        {/* Admin view: Show both B2B and B2C prices */}
        {canSeeBothPrices ? (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex items-end gap-1.5">
                <span className="text-xs font-semibold text-blue-700">B2B:</span>
                <span className="text-xl font-extrabold text-foreground md:text-2xl">
                  {formatPrice(priceB2B)}
                </span>
              </div>
              <div className="flex items-end gap-1.5">
                <span className="text-xs font-semibold text-green-700">B2C:</span>
                <span className="text-lg font-bold text-muted-foreground md:text-xl">
                  {formatPrice(priceB2C)}
                </span>
              </div>
            </div>
            {mrp > (priceB2C ?? 0) && (
              <span className="text-sm text-muted-foreground line-through">
                MRP: {formatPrice(mrp)}
              </span>
            )}
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-semibold text-purple-700 md:text-[10px]">
                Admin View
              </span>
            </div>
          </div>
        ) : (
          /* Customer view */
          <>
            <div className="flex items-end gap-2.5">
              <span className="text-xl font-extrabold text-foreground md:text-3xl">
                {formatPrice(price)}
              </span>
              {mrp > price && (
                <span className="pb-0.5 text-sm text-muted-foreground line-through md:text-base">
                  {formatPrice(mrp)}
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              {savings > 0 && (
                <span className="text-[11px] font-semibold text-stb-success md:text-xs">
                  You save {formatPrice(savings)} ({discount}%)
                </span>
              )}
              {isB2B && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700 md:text-[10px]">
                  B2B Price
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── Stock + Qty ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-semibold md:text-sm ${inStock ? "text-stb-success" : "text-destructive"}`}>
          {inStock ? `In Stock (${product.stock} ${product.unit}s)` : "Out of Stock"}
        </span>
        {inStock && (
          <div className="flex items-center overflow-hidden rounded-lg border border-border">
            <button onClick={() => changeQty(-1)} disabled={qty <= (product.minOrderQty || 1)} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 md:h-9 md:w-9">
              <Minus className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </button>
            <span className="w-10 text-center text-xs font-bold md:text-sm">{qty}</span>
            <button onClick={() => changeQty(1)} disabled={qty >= product.stock} className="flex h-8 w-8 items-center justify-center text-muted-foreground hover:bg-muted disabled:opacity-40 md:h-9 md:w-9">
              <Plus className="h-3 w-3 md:h-3.5 md:w-3.5" />
            </button>
          </div>
        )}
      </div>
      {qty > 1 && (
        <p className="text-[10px] text-muted-foreground md:text-[11px]">
          Total: <span className="font-bold text-foreground">{formatPrice(totalPrice)}</span>
        </p>
      )}

      {/* ── Action buttons — DESKTOP (visible md+) ───────────────────── */}
      <div className="hidden gap-2.5 md:flex">
        <button
          onClick={handleAddToCart}
          disabled={!inStock || addingCart}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl border-2 border-primary bg-white py-3 text-sm font-bold text-primary transition-colors hover:bg-stb-red-light disabled:opacity-40"
        >
          {addingCart ? <Loader2 className="h-4 w-4 animate-spin" /> : cartAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-4 w-4" />}
          {addingCart ? "Adding…" : cartAdded ? "Added!" : "Add to Cart"}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!inStock}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white transition-colors hover:bg-stb-red-dark disabled:opacity-40"
        >
          <Zap className="h-4 w-4" />
          Buy Now
        </button>
      </div>

      {/* Wishlist + Share */}
      <div className="flex items-center gap-4">
        <button onClick={handleWishlist} disabled={wishlistLoading} className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors md:text-xs ${wishlisted ? "text-primary" : "text-muted-foreground hover:text-primary"}`}>
          {wishlistLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-current" : ""}`} />}
          {wishlisted ? "Wishlisted" : "Wishlist"}
        </button>
        <button onClick={handleShare} className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground md:text-xs">
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
      </div>

      {/* ── Trust badges ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2 md:gap-3">
        {[
          { icon: Truck, label: "Fast Delivery", sub: "2–5 days" },
          { icon: Shield, label: "1 Yr Warranty", sub: "Manufacturer" },
          { icon: RotateCcw, label: "Easy Returns", sub: "7 days" },
        ].map(({ icon: Icon, label, sub }) => (
          <div key={label} className="flex flex-col items-center gap-1 rounded-xl border border-border bg-white p-2.5 text-center md:p-3">
            <Icon className="h-4 w-4 text-primary md:h-5 md:w-5" />
            <span className="text-[10px] font-semibold text-foreground md:text-[11px]">{label}</span>
            <span className="text-[9px] text-muted-foreground md:text-[10px]">{sub}</span>
          </div>
        ))}
      </div>

      {/* Tags */}
      {product.tags && product.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <span className="text-[10px] text-muted-foreground">Tags:</span>
          {product.tags.map((t) => (
            <span key={t} className="rounded-full border border-border px-2 py-0.5 text-[10px] text-muted-foreground">
              {t}
            </span>
          ))}
        </div>
      )}

      {/* ── Sticky mobile buy bar ──────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 z-40 flex gap-2 border-t border-border bg-white px-3 py-2.5 shadow-lg md:hidden"
        style={{ bottom: "calc(64px + env(safe-area-inset-bottom, 0px))" }}
      >
        <button
          onClick={handleAddToCart}
          disabled={!inStock || addingCart}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border-2 border-primary bg-white py-2.5 text-xs font-bold text-primary disabled:opacity-40"
        >
          {addingCart ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShoppingCart className="h-3.5 w-3.5" />}
          {cartAdded ? "Added!" : "Add to Cart"}
        </button>
        <button
          onClick={handleBuyNow}
          disabled={!inStock}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary py-2.5 text-xs font-bold text-white disabled:opacity-40"
        >
          <Zap className="h-3.5 w-3.5" />
          Buy Now
        </button>
      </div>
    </div>
  );
}
