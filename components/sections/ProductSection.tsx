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
import { Heart, ShoppingCart, Star, Loader2, ChevronRight, Check, AlertCircle } from "lucide-react";

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
}

interface SubcategoryTab {
  name: string;
  href?: string;
}

interface ProductSectionData {
  title: string;
  slug: string;
  subcategories: SubcategoryTab[];
  products: Product[];
}

interface ProductSectionProps {
  section: ProductSectionData;
}

// ── Inline card — keeps ProductSection self-contained ─────────────────────
function SectionProductCard({ product }: { product: Product }) {
  const { data: session } = useSession();
  const router = useRouter();
  const { addToCart } = useCart();
  const { isInWishlist, toggle: toggleWishlist, isLoading: wishlistLoading } = useWishlist();

  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);
  const [hovered, setHovered] = useState(false);

  const isB2B = session?.user?.isGstVerified === true;
  // Ensure we have valid numbers - sometimes data comes as strings from DB
  const priceB2C = Number(product.priceB2C) || 0;
  const priceB2B = Number(product.priceB2B) || 0;
  const price = isB2B ? priceB2B : priceB2C;
  const mrp = Number(product.mrp) || 0;
  const discount = mrp > price ? Math.round(((mrp - price) / mrp) * 100) : 0;
  const savings = mrp > price ? mrp - price : 0;
  const wishlisted = isInWishlist(product.id);
  const rating = product.rating || 0;

  const handleCart = async () => {
    if (!session) { 
      router.push(`/auth/login?callbackUrl=/product/${product.slug}`); 
      return; 
    }
    
    setCartError(null);
    setAddedToCart(false);
    setAddingToCart(true);
    
    try {
      const result = await addToCart(product.id, 1);
      
      if (result.success) {
        setAddedToCart(true);
        setTimeout(() => setAddedToCart(false), 2000);
      } else {
        setCartError(result.error || "Failed to add");
        setTimeout(() => setCartError(null), 3000);
      }
    } catch {
      setCartError("Something went wrong");
      setTimeout(() => setCartError(null), 3000);
    } finally {
      setAddingToCart(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!session) { router.push(`/auth/login?callbackUrl=/product/${product.slug}`); return; }
    await toggleWishlist(product.id);
  };

  return (
    <div
      className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all duration-200 hover:border-primary/30 hover:shadow-lg"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image area */}
      <div className="relative bg-[#FAFAFA]">
        {/* Discount badge */}
        {discount > 0 && (
          <span className="absolute left-1.5 top-1.5 z-10 rounded bg-primary px-1.5 py-0.5 text-[8px] font-bold text-white md:left-2 md:top-2 md:text-[9px]">
            -{discount}%
          </span>
        )}
        {/* Wishlist */}
        <button
          onClick={handleWishlist}
          disabled={wishlistLoading}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className={`absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full border transition-all press-active shadow-sm ${
            wishlisted
              ? "border-primary bg-primary text-white"
              : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
          }`}
        >
          {wishlistLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Heart className={`h-3.5 w-3.5 ${wishlisted ? "fill-current" : ""}`} />
          )}
        </button>

        {/* Image */}
        <Link href={`/product/${product.slug}`} className="block p-3 md:p-4">
          <div className="relative aspect-square w-full">
            <Image
              src={hovered && product.secondImage ? product.secondImage : product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 200px"
              className="object-contain transition-transform duration-300 group-hover:scale-105"
              unoptimized
            />
          </div>
        </Link>
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col px-2.5 pb-2.5 pt-2 md:px-3 md:pb-3 md:pt-2.5">
        {/* Brand */}
        <span className="text-[9px] font-semibold uppercase tracking-wide text-primary md:text-[10px]">
          {product.brand}
        </span>
        {/* Name */}
        <Link href={`/product/${product.slug}`} className="mt-0.5 block">
          <h3 className="line-clamp-2 text-xs font-medium leading-snug text-foreground hover:text-primary md:text-[13px]">
            {product.name}
          </h3>
        </Link>
        {/* Stars */}
        {rating > 0 && (
          <div className="mt-1 flex items-center gap-0.5">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                className={`h-2 w-2 md:h-2.5 md:w-2.5 ${s <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "fill-muted text-muted"}`}
              />
            ))}
          </div>
        )}

        <div className="flex-1" />

        {/* Price */}
        <div className="mt-2 space-y-0.5">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-extrabold text-foreground md:text-base">
              ₹{price.toLocaleString("en-IN")}
            </span>
            {mrp > price && (
              <span className="text-[9px] text-muted-foreground line-through md:text-[10px]">
                ₹{mrp.toLocaleString("en-IN")}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            {savings > 0 ? (
              <span className="text-[9px] font-medium text-stb-success md:text-[10px]">
                Save ₹{savings.toLocaleString("en-IN")}
              </span>
            ) : <span />}
            <span className={`text-[9px] font-semibold md:text-[10px] ${product.inStock ? "text-stb-success" : "text-destructive"}`}>
              {product.inStock ? "In Stock" : "Out of Stock"}
            </span>
          </div>
        </div>

        {/* Error message */}
        {cartError && (
          <div className="mt-2 flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1.5 text-[10px] text-red-600">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span className="line-clamp-1">{cartError}</span>
          </div>
        )}

        {/* Add to Cart */}
        <button
          onClick={handleCart}
          disabled={!product.inStock || addingToCart}
          className={`mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold text-white transition-all press-active ${
            addedToCart
              ? "bg-stb-success"
              : "bg-primary hover:bg-stb-red-dark disabled:cursor-not-allowed disabled:opacity-40"
          }`}
        >
          {addingToCart ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : addedToCart ? (
            <>
              <Check className="h-3 w-3" />
              Added!
            </>
          ) : (
            <>
              <ShoppingCart className="h-3 w-3" />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────────────
export default function ProductSection({ section }: ProductSectionProps) {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <section className="bg-white py-4 md:py-6">
      <div className="mx-auto max-w-7xl px-3 md:px-4">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2 md:mb-4">
          <div className="flex items-center gap-2">
            <span className="block h-4 w-[3px] rounded-full bg-primary md:h-5" />
            <h2 className="text-sm font-bold text-foreground md:text-base">{section.title}</h2>
          </div>
          <Link
            href={`/category/${section.slug}`}
            className="flex shrink-0 items-center gap-0.5 text-[11px] font-semibold text-primary hover:text-stb-red-dark md:text-xs"
          >
            View All <ChevronRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Subcategory filter tabs */}
        {section.subcategories.length > 1 && (
          <div className="mb-3 flex gap-1.5 overflow-x-auto scrollbar-hide md:mb-4 md:gap-2">
            {section.subcategories.map((sub, i) =>
              sub.href ? (
                <Link
                  key={i}
                  href={sub.href}
                  className="shrink-0 rounded-full border border-border bg-white px-3 py-1 text-[10px] font-semibold text-muted-foreground transition-all hover:border-primary hover:text-primary md:text-[11px]"
                >
                  {sub.name}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={() => setActiveTab(i)}
                  className={`shrink-0 rounded-full border px-3 py-1 text-[10px] font-semibold transition-all md:text-[11px] ${
                    activeTab === i
                      ? "border-primary bg-primary text-white shadow-sm"
                      : "border-border bg-white text-muted-foreground hover:border-primary hover:text-primary"
                  }`}
                >
                  {sub.name}
                </button>
              )
            )}
          </div>
        )}

        {/* Products carousel */}
        <Carousel
          opts={{ align: "start", loop: false, skipSnaps: true }}
          className="w-full"
        >
          <CarouselContent className="-ml-2 md:-ml-3">
            {section.products.map((product) => (
              <CarouselItem
                key={product.id}
                className="basis-1/2 pl-2 sm:basis-1/3 md:basis-1/4 md:pl-3 lg:basis-1/5"
              >
                <SectionProductCard product={product} />
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
