"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Heart,
  ShoppingCart,
  Trash2,
  ArrowRight,
  Loader2,
  ChevronRight,
  PackageSearch,
} from "lucide-react";
import { useWishlist, useCart } from "@/components/providers/CartWishlistProvider";

interface WishlistProduct {
  _id: string;
  name: string;
  slug: string;
  images?: string[];
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  stock: number;
  brand?: string;
  isActive: boolean;
}

interface WishlistItem {
  product: WishlistProduct;
  addedAt: string;
}

export default function WishlistPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [removingItems, setRemovingItems] = useState<Set<string>>(new Set());
  const [addingToCart, setAddingToCart] = useState<Set<string>>(new Set());
  const { refresh: refreshGlobalWishlist } = useWishlist();
  const { refresh: refreshGlobalCart } = useCart();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/login?callbackUrl=/wishlist");
      return;
    }
    if (status === "authenticated") {
      fetchWishlist();
    }
  }, [status, router]);

  const fetchWishlist = async () => {
    try {
      const res = await fetch("/api/wishlist");
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error("Error fetching wishlist:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    setRemovingItems((prev) => new Set(prev).add(productId));
    try {
      const res = await fetch(`/api/wishlist?productId=${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((i) => i.product._id !== productId));
        // Refresh global wishlist to update badge and hearts
        refreshGlobalWishlist();
      }
    } catch (error) {
      console.error("Error removing from wishlist:", error);
    } finally {
      setRemovingItems((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const addToCart = async (productId: string) => {
    setAddingToCart((prev) => new Set(prev).add(productId));
    try {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity: 1 }),
      });
      if (res.ok) {
        // Refresh global cart to update badge
        refreshGlobalCart();
        // Optionally remove from wishlist after adding to cart
        await removeFromWishlist(productId);
      }
    } catch (error) {
      console.error("Error adding to cart:", error);
    } finally {
      setAddingToCart((prev) => {
        const next = new Set(prev);
        next.delete(productId);
        return next;
      });
    }
  };

  const clearWishlist = async () => {
    try {
      await Promise.all(items.map((i) => removeFromWishlist(i.product._id)));
    } catch (error) {
      console.error("Error clearing wishlist:", error);
    }
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-background">
        {/* Breadcrumb */}
        <div className="border-b border-border bg-card">
          <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm">
            <Link href="/" className="text-muted-foreground hover:text-primary">
              Home
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-foreground">Wishlist</span>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-8">
          {/* Page Header */}
          <div className="mb-8 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="heading-xl">My Wishlist</h1>
              {items.length > 0 && (
                <Badge className="bg-primary text-white text-sm px-3 py-1">
                  {items.length} {items.length === 1 ? "item" : "items"}
                </Badge>
              )}
            </div>
            {items.length > 0 && (
              <button
                onClick={clearWishlist}
                className="flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                Clear All
              </button>
            )}
          </div>

          {/* Empty State */}
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20 shadow-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-stb-red-light">
                <Heart className="h-10 w-10 text-primary" />
              </div>
              <h2 className="heading-lg mt-6">Your wishlist is empty</h2>
              <p className="body-md mt-2 max-w-sm text-center text-muted-foreground">
                Save items you love to your wishlist. Review them anytime and move them to your cart.
              </p>
              <Link href="/" className="mt-8">
                <Button className="gap-2" size="lg">
                  <PackageSearch className="h-5 w-5" />
                  Explore Products
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {items.map((item) => {
                const product = item.product;
                if (!product) return null;
                // Users with verified GST get B2B wholesale prices
                const isB2B = session?.user?.isGstVerified === true;
                const price = isB2B ? (product.priceB2B ?? 0) : (product.priceB2C ?? 0);
                const mrp = product.mrp ?? 0;
                const discount = mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
                const inStock = (product.stock ?? 0) > 0;

                return (
                  <div
                    key={product._id}
                    className="group relative flex flex-col rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                  >
                    {/* Remove button */}
                    <button
                      onClick={() => removeFromWishlist(product._id)}
                      disabled={removingItems.has(product._id)}
                      className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md text-muted-foreground transition-colors hover:bg-destructive hover:text-white disabled:opacity-50"
                      aria-label="Remove from wishlist"
                    >
                      {removingItems.has(product._id) ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>

                    {/* Discount badge */}
                    {discount > 0 && (
                      <div className="absolute left-3 top-3 z-10">
                        <Badge className="bg-primary text-white text-xs">
                          -{discount}%
                        </Badge>
                      </div>
                    )}

                    {/* Product image */}
                    <Link
                      href={`/product/${product.slug}`}
                      className="block overflow-hidden rounded-t-xl bg-muted"
                    >
                      <div className="relative aspect-square">
                        <Image
                          src={product.images?.[0] || "https://placehold.co/300x300/f5f5f5/737373?text=No+Image"}
                          alt={product.name}
                          fill
                          className="object-cover transition-transform duration-300 group-hover:scale-105"
                          unoptimized
                        />
                      </div>
                    </Link>

                    {/* Product info */}
                    <div className="flex flex-1 flex-col gap-2 p-4">
                      {product.brand && (
                        <span className="body-sm text-muted-foreground">
                          {product.brand}
                        </span>
                      )}

                      <Link href={`/product/${product.slug}`}>
                        <h3 className="heading-sm line-clamp-2 hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                      </Link>

                      {/* Stock status */}
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            inStock ? "bg-stb-success" : "bg-destructive"
                          }`}
                        />
                        <span
                          className={`body-sm font-medium ${
                            inStock ? "text-stb-success" : "text-destructive"
                          }`}
                        >
                          {inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>

                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-primary">
                          ₹{price.toLocaleString("en-IN")}
                        </span>
                        {mrp > price && (
                          <span className="body-sm text-muted-foreground line-through">
                            ₹{mrp.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="mt-auto flex flex-col gap-2 pt-2">
                        <Button
                          className="w-full gap-2"
                          disabled={!inStock || addingToCart.has(product._id)}
                          onClick={() => addToCart(product._id)}
                        >
                          {addingToCart.has(product._id) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ShoppingCart className="h-4 w-4" />
                          )}
                          {addingToCart.has(product._id)
                            ? "Adding..."
                            : "Move to Cart"}
                        </Button>
                        <Link href={`/product/${product.slug}`}>
                          <Button variant="outline" className="w-full gap-2">
                            View Details
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
