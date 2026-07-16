"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Heart, ShoppingCart, Trash2, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWishlist } from "@/components/providers/CartWishlistProvider";

interface WishlistProduct {
  _id: string;
  name: string;
  slug: string;
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  images?: string[];
  stock: number;
  brand?: string;
  isActive?: boolean;
}

interface WishlistItem {
  product: WishlistProduct;
  addedAt: string;
}

export default function WishlistPage() {
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);
  const { refresh: refreshGlobalWishlist } = useWishlist();

  const fetchWishlist = () => {
    fetch("/api/wishlist")
      .then((r) => r.json())
      .then((d) => setItems(d.items || []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleRemove = async (productId: string) => {
    setRemoving(productId);
    try {
      const res = await fetch(`/api/wishlist?productId=${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setItems((prev) => prev.filter((item) => item.product._id !== productId));
        // Refresh global wishlist state to update badge and ProductCard hearts
        refreshGlobalWishlist();
      }
    } finally {
      setRemoving(null);
    }
  };

  if (loading) {
    return (
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border h-60 animate-pulse" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-20 text-center">
        <Heart className="h-14 w-14 text-muted-foreground/20 mb-4" />
        <p className="text-base font-semibold text-foreground">Your wishlist is empty</p>
        <p className="text-sm text-muted-foreground mt-1">Save items you love and come back to them later</p>
        <Link href="/" className="mt-5">
          <Button size="sm">Browse Products</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{items.length} item{items.length !== 1 ? "s" : ""} saved</p>
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map(({ product, addedAt }) => {
          const priceB2C = product.priceB2C ?? 0;
          const mrp = product.mrp ?? 0;
          const displayPrice = priceB2C > 0 ? priceB2C : mrp;
          const hasDiscount = mrp > priceB2C && priceB2C > 0;
          const isOutOfStock = (product.stock ?? 0) === 0;

          return (
            <div key={product._id} className="bg-card rounded-2xl border border-border overflow-hidden hover:shadow-md transition-shadow group press-active">
              {/* Image */}
              <Link href={`/product/${product.slug}`} className="block relative aspect-[4/3] overflow-hidden bg-muted">
                {product.images?.[0] ? (
                  <img
                    src={product.images[0]}
                    alt={product.name}
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-full w-full flex items-center justify-center">
                    <ShoppingCart className="h-10 w-10 text-muted-foreground/30" />
                  </div>
                )}
                {isOutOfStock && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="text-white text-xs font-semibold bg-black/60 px-3 py-1 rounded-full">Out of Stock</span>
                  </div>
                )}
              </Link>

              {/* Info */}
              <div className="p-4">
                <Link href={`/product/${product.slug}`}>
                  <h3 className="text-sm font-semibold text-foreground leading-snug line-clamp-2 hover:text-primary transition-colors">
                    {product.name}
                  </h3>
                </Link>
                {product.brand && (
                  <p className="text-xs text-muted-foreground mt-0.5">{product.brand}</p>
                )}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-base font-bold text-foreground">₹{displayPrice.toLocaleString("en-IN")}</span>
                  {hasDiscount && (
                    <span className="text-xs text-muted-foreground line-through">₹{mrp.toLocaleString("en-IN")}</span>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Added {new Date(addedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>

                <div className="flex gap-2 mt-3">
                  <Button asChild size="sm" className="flex-1 text-xs" disabled={isOutOfStock} variant={isOutOfStock ? "outline" : "default"}>
                    <Link href={`/product/${product.slug}`}>
                      <ExternalLink className="h-3 w-3 mr-1" />
                      {isOutOfStock ? "View Product" : "Buy Now"}
                    </Link>
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-destructive border-destructive hover:bg-destructive hover:text-white"
                    onClick={() => handleRemove(product._id)}
                    disabled={removing === product._id}
                  >
                    {removing === product._id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
