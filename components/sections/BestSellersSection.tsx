"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useCart, useWishlist } from "@/components/providers/CartWishlistProvider";
import { Heart, Star, Loader2, ChevronRight, TrendingUp, Plus, ArrowDown } from "lucide-react";

interface Product {
  id: string;
  name: string;
  slug: string;
  image: string;
  secondImage?: string;
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  inStock: boolean;
  brand: string;
  rating?: number;
  soldCount?: number;
}

interface BestSellersSectionProps {
  products: Product[];
  title?: string;
}

function BestSellerCard({ product, rank }: { product: Product; rank: number }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addToCart } = useCart();
  const { isInWishlist, toggle: toggleWishlist, isLoading: wishlistLoading } = useWishlist();

  const [addingToCart, setAddingToCart] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isB2B = session?.user?.isGstVerified === true;
  const price = isB2B ? (product.priceB2B ?? 0) : (product.priceB2C ?? 0);
  const mrp = product.mrp ?? 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savings = mrp > price ? mrp - price : 0;
  const wishlisted = isInWishlist(product.id);
  const rating = product.rating || 0;

  const handleCart = async () => {
    if (!session) { router.push(`/auth/login?callbackUrl=/product/${product.slug}`); return; }
    setAddingToCart(true);
    try { await addToCart(product.id, 1); } finally { setAddingToCart(false); }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session) { router.push(`/auth/login?callbackUrl=/product/${product.slug}`); return; }
    await toggleWishlist(product.id);
  };

  return (
    <div
      className="stb-card"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Image tile ─────────────────────────────────────────────────── */}
      <div className="stb-card-tile">
        {/* Discount chip, or the rank badge when there's no discount to show */}
        {discount > 0 ? (
          <span className="stb-chip-deal">
            <ArrowDown className="h-2.5 w-2.5" strokeWidth={3} />
            {discount}%
          </span>
        ) : (
          <span className="stb-chip-deal bg-stb-warning">#{rank}</span>
        )}

        {/* Rank marker — sits below the discount chip when both are present */}
        {discount > 0 && (
          <span className="absolute left-1.5 top-6 z-10 flex h-5 min-w-5 items-center justify-center rounded bg-stb-warning px-1 text-[9px] font-bold leading-none text-white">
            #{rank}
          </span>
        )}

        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          disabled={wishlistLoading}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full transition-all press-active ${
            wishlisted
              ? "bg-primary text-white shadow-sm"
              : "bg-card/85 text-muted-foreground shadow-sm hover:text-primary"
          }`}
        >
          {wishlistLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-current" : ""}`} />
          )}
        </button>

        {/* Rating pill */}
        {rating > 0 && (
          <span className="stb-chip-rating">
            {rating.toFixed(1)}
            <Star className="h-2.5 w-2.5 fill-stb-rating text-stb-rating" />
          </span>
        )}

        {/* Quick-add */}
        <button
          onClick={handleCart}
          disabled={!product.inStock || addingToCart}
          aria-label="Add to cart"
          className="stb-add-btn"
        >
          {addingToCart ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Plus className="h-4 w-4" strokeWidth={2.5} />
          )}
        </button>

        {/* Image */}
        <Link href={`/product/${product.slug}`} className="block p-2.5 md:p-3">
          <div className="relative aspect-square w-full">
            <Image
              src={hovered && product.secondImage ? product.secondImage : product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 45vw, 200px"
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              unoptimized
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

        {/* Social proof */}
        {product.soldCount && product.soldCount > 0 && (
          <span className="mt-0.5 text-[10px] font-medium text-muted-foreground">
            {product.soldCount} sold
          </span>
        )}

        <div className="flex-1" />

        {/* Price */}
        <div className="mt-1.5">
          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            {mrp > price && (
              <span className="text-[11px] text-muted-foreground line-through">
                ₹{mrp.toLocaleString("en-IN")}
              </span>
            )}
            <span className="text-[15px] font-extrabold leading-none text-foreground">
              ₹{price.toLocaleString("en-IN")}
            </span>
          </div>
          {savings > 0 && (
            <span className="mt-0.5 block text-[10px] font-bold text-stb-deal">
              Save ₹{savings.toLocaleString("en-IN")}
            </span>
          )}
          {!product.inStock && (
            <span className="mt-0.5 block text-[10px] font-bold text-destructive">
              Out of Stock
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BestSellersSection({ products, title = "Best Sellers" }: BestSellersSectionProps) {
  if (!products || products.length === 0) return null;

  return (
    <section className="bg-stb-tint-amber py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-3 md:px-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2 md:mb-4">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-stb-warning">
              <TrendingUp className="h-3.5 w-3.5 text-white" />
            </span>
            <h2 className="stb-rail-title truncate">{title}</h2>
          </div>
          <Link
            href="/products?sortBy=bestselling"
            aria-label={`View all ${title}`}
            className="stb-rail-arrow"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        </div>

        {/* Products carousel */}
        <Carousel
          opts={{ align: "start", loop: false, skipSnaps: true }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-3">
            {products.map((product, index) => (
              <CarouselItem
                key={product.id}
                className="basis-1/2 pl-2 sm:basis-1/3 md:basis-1/4 md:pl-3 lg:basis-1/5"
              >
                <BestSellerCard product={product} rank={index + 1} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-0 hidden h-8 w-8 border border-border bg-white shadow-sm hover:border-primary hover:bg-primary hover:text-white md:flex" />
          <CarouselNext className="right-0 hidden h-8 w-8 border border-border bg-white shadow-sm hover:border-primary hover:bg-primary hover:text-white md:flex" />
        </Carousel>
      </div>
    </section>
  );
}
