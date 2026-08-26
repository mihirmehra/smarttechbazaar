"use client";

import { useState } from "react";
import Image from "@/components/ui/safe-image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useCart, useWishlist } from "@/components/providers/CartWishlistProvider";
import { Heart, Star, Loader2, Check, Plus, AlertCircle, ArrowDown } from "lucide-react";
import { getPricingInfo, formatPrice } from "@/lib/pricing";

interface Product {
  _id: string;
  name: string;
  slug: string;
  images?: string[];
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  stock: number;
  brand?: string;
  brandLogo?: string;
  productId?: string;
  itemCode?: string;
  rating?: number;
  isFeatured?: boolean;
  isNewArrival?: boolean;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addToCart } = useCart();
  const { isInWishlist, toggle: toggleWishlist, isLoading: isWishlistLoading } = useWishlist();

  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  // Use centralized pricing logic
  const pricing = getPricingInfo(product, session);
  const { displayPrice, mrp, discount, isB2B, canSeeBothPrices, priceB2B, priceB2C } = pricing;

  const isWishlisted = isInWishlist(product._id);
  const inStock = (Number(product.stock) || 0) > 0;
  const rating = product.rating || 0;

  const handleAddToCart = async () => {
    if (!session) {
      router.push(`/auth/login?callbackUrl=/product/${product.slug}`);
      return;
    }

    // Reset states
    setCartError(null);
    setAddedToCart(false);
    setIsAddingToCart(true);

    try {
      const result = await addToCart(product._id, 1);

      if (result.success) {
        setAddedToCart(true);
        // Reset success state after 2 seconds
        setTimeout(() => setAddedToCart(false), 2000);
      } else {
        setCartError(result.error || "Failed to add to cart");
        // Clear error after 3 seconds
        setTimeout(() => setCartError(null), 3000);
      }
    } catch (error) {
      console.error("Add to cart error:", error);
      setCartError("Something went wrong");
      setTimeout(() => setCartError(null), 3000);
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session) {
      router.push(`/auth/login?callbackUrl=/product/${product.slug}`);
      return;
    }
    await toggleWishlist(product._id);
  };

  return (
    <div
      className="stb-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image tile ─────────────────────────────────────────────────── */}
      <div className="stb-card-tile">
        {/* Discount chip — top-left, flush to the card corner */}
        {discount > 0 && (
          <span className="stb-chip-deal">
            <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />
            {discount}%
          </span>
        )}

        {/* New-arrival marker sits opposite the discount so they never collide */}
        {product.isNewArrival && !isWishlisted && (
          <span className="absolute right-1.5 top-1.5 z-10 rounded bg-stb-info px-1 py-0.5 text-[9px] font-bold uppercase leading-none tracking-wide text-white">
            New
          </span>
        )}

        {/* Wishlist — only rendered on hover/active at md+ to keep the tile clean */}
        <button
          onClick={handleWishlist}
          disabled={isWishlistLoading}
          aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full transition-all press-active ${
            product.isNewArrival && !isWishlisted ? "top-8" : "top-1.5"
          } ${
            isWishlisted
              ? "bg-primary text-white shadow-sm"
              : "bg-card/85 text-muted-foreground shadow-sm hover:text-primary"
          }`}
        >
          {isWishlistLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className={`h-3.5 w-3.5 ${isWishlisted ? "fill-current" : ""}`} />
          )}
        </button>

        {/* Rating pill — floats bottom-left over the tile */}
        {rating > 0 && (
          <span className="stb-chip-rating">
            {rating.toFixed(1)}
            <Star className="h-2.5 w-2.5 fill-stb-rating text-stb-rating" />
          </span>
        )}

        {/* Quick-add — straddles the tile/info boundary */}
        <button
          onClick={handleAddToCart}
          disabled={!inStock || isAddingToCart}
          aria-label={addedToCart ? "Added to cart" : "Add to cart"}
          className="stb-add-btn"
        >
          {isAddingToCart ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : addedToCart ? (
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>

        {/* Product image */}
        <Link href={`/product/${product.slug}`} className="block p-2.5 md:p-3">
          <div className="relative aspect-square w-full">
            <Image
              src={
                hovered && product.images?.[1]
                  ? product.images[1]
                  : product.images?.[0] || "https://placehold.co/300x300?text=No+Image"
              }
              alt={product.name}
              fill
              sizes="(max-width: 640px) 45vw, 200px"
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
              quality={75}
            />
          </div>
        </Link>
      </div>

      {/* ── Info ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col px-2 pb-2 pt-3.5 md:px-2.5 md:pb-2.5">
        {/* Brand capsule */}
        {product.brand && <span className="stb-meta-chip">{product.brand}</span>}

        {/* Name */}
        <Link href={`/product/${product.slug}`} className="mt-1 block">
          <h3 className="line-clamp-2 text-[13px] font-bold leading-tight text-foreground transition-colors hover:text-primary">
            {product.name}
          </h3>
        </Link>

        <div className="flex-1" />

        {/* Price block */}
        <div className="mt-1.5">
          {canSeeBothPrices ? (
            /* Admin view: both B2B and B2C */
            <div className="space-y-0.5">
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-bold text-stb-info">B2B</span>
                <span className="text-sm font-extrabold text-foreground">
                  {formatPrice(priceB2B)}
                </span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-[10px] font-bold text-stb-success">B2C</span>
                <span className="text-[13px] font-bold text-muted-foreground">
                  {formatPrice(priceB2C)}
                </span>
              </div>
            </div>
          ) : (
            /* Customer view: MRP struck through, then live price */
            <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
              {mrp > displayPrice && (
                <span className="text-[11px] text-muted-foreground line-through">
                  {formatPrice(mrp)}
                </span>
              )}
              <span className="text-[15px] font-extrabold leading-none text-foreground">
                {formatPrice(displayPrice)}
              </span>
              {isB2B && (
                <span className="rounded bg-stb-tint-blue px-1 py-0.5 text-[8px] font-bold text-stb-info">
                  B2B
                </span>
              )}
            </div>
          )}

          {!inStock && (
            <span className="mt-1 block text-[10px] font-bold text-destructive">
              Out of Stock
            </span>
          )}
        </div>

        {/* Error message */}
        {cartError && (
          <div className="mt-1.5 flex items-center gap-1 rounded bg-stb-red-light px-1.5 py-1 text-[10px] font-medium text-destructive">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{cartError}</span>
          </div>
        )}
      </div>
    </div>
  );
}
