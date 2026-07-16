"use client";

import { createContext, useContext, useCallback, useMemo, ReactNode, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";

// Types
interface CartProduct {
  _id: string;
  name: string;
  slug: string;
  images?: string[];
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  stock: number;
  brand?: string;
}

interface CartItem {
  product: CartProduct;
  quantity: number;
  price: number;
  total: number;
}

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

interface CartData {
  items: CartItem[];
  total: number;
  isB2B: boolean;
}

interface WishlistData {
  items: WishlistItem[];
  count: number;
}

interface CartWishlistContextType {
  // Cart
  cart: CartData | null;
  cartCount: number;
  cartTotal: number;
  isCartLoading: boolean;
  isCartMutating: boolean;
  addToCart: (productId: string, quantity?: number) => Promise<{ success: boolean; error?: string }>;
  updateCartQuantity: (productId: string, quantity: number) => Promise<{ success: boolean; error?: string }>;
  removeFromCart: (productId: string) => Promise<{ success: boolean; error?: string }>;
  clearCart: () => Promise<{ success: boolean; error?: string }>;
  refreshCart: () => void;
  
  // Wishlist
  wishlist: WishlistData | null;
  wishlistCount: number;
  isWishlistLoading: boolean;
  isInWishlist: (productId: string) => boolean;
  addToWishlist: (productId: string) => Promise<boolean>;
  removeFromWishlist: (productId: string) => Promise<boolean>;
  toggleWishlist: (productId: string) => Promise<boolean>;
  refreshWishlist: () => void;
}

const CartWishlistContext = createContext<CartWishlistContextType | null>(null);

// Fetcher function with cache-busting for mobile apps
const fetcher = async (url: string) => {
  const cacheBuster = `_t=${Date.now()}`;
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}${cacheBuster}`, {
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Pragma": "no-cache",
    },
    // Disable browser cache completely
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("Network response was not ok");
  }
  return response.json();
};

export function CartWishlistProvider({ children }: { children: ReactNode }) {
  const { data: session, status } = useSession();
  const isAuthenticated = status === "authenticated";
  const [isCartMutating, setIsCartMutating] = useState(false);

  // Cart SWR with better config for mobile - using key that changes to force refetch
  const {
    data: cartData,
    mutate: mutateCart,
    isLoading: isCartLoading,
  } = useSWR<CartData>(
    isAuthenticated ? "/api/cart" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 500,
      focusThrottleInterval: 2000,
      errorRetryCount: 3,
      revalidateIfStale: true,
      // Keep previous data while fetching new data
      keepPreviousData: true,
      // Refresh in background every 30 seconds
      refreshInterval: 30000,
    }
  );

  // Wishlist SWR with better config for mobile
  const {
    data: wishlistData,
    mutate: mutateWishlist,
    isLoading: isWishlistLoading,
  } = useSWR<WishlistData>(
    isAuthenticated ? "/api/wishlist" : null,
    fetcher,
    {
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      revalidateOnMount: true,
      dedupingInterval: 500,
      focusThrottleInterval: 2000,
      errorRetryCount: 3,
      revalidateIfStale: true,
      keepPreviousData: true,
      refreshInterval: 30000,
    }
  );

  // Cart count
  const cartCount = useMemo(() => {
    if (!cartData?.items) return 0;
    return cartData.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cartData]);

  // Cart total
  const cartTotal = useMemo(() => {
    return cartData?.total || 0;
  }, [cartData]);

  // Wishlist count
  const wishlistCount = useMemo(() => {
    return wishlistData?.items?.length || 0;
  }, [wishlistData]);

  // Check if product is in wishlist
  const isInWishlist = useCallback(
    (productId: string) => {
      if (!wishlistData?.items) return false;
      return wishlistData.items.some((item) => item.product._id === productId);
    },
    [wishlistData]
  );

  // Add to cart with optimistic update and better error handling
  const addToCart = useCallback(
    async (productId: string, quantity = 1): Promise<{ success: boolean; error?: string }> => {
      if (!isAuthenticated) {
        return { success: false, error: "Please login to add items to cart" };
      }
      
      setIsCartMutating(true);
      
      // Optimistic update - increment cart count immediately
      const previousData = cartData;
      if (cartData) {
        const existingItem = cartData.items.find(item => item.product._id === productId);
        if (existingItem) {
          // Update existing item quantity optimistically
          mutateCart({
            ...cartData,
            items: cartData.items.map(item =>
              item.product._id === productId
                ? { ...item, quantity: item.quantity + quantity }
                : item
            ),
          }, false);
        } else {
          // For new items, just show loading state - we'll get real data from server
        }
      }
      
      try {
        const res = await fetch("/api/cart", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({ productId, quantity }),
        });

        const data = await res.json();

        if (res.ok) {
          // Revalidate to get actual server data
          await mutateCart();
          setIsCartMutating(false);
          return { success: true };
        }
        
        // Revert optimistic update on error
        if (previousData) {
          mutateCart(previousData, false);
        }
        setIsCartMutating(false);
        return { success: false, error: data.error || "Failed to add item to cart" };
      } catch (error) {
        // Revert optimistic update on error
        if (previousData) {
          mutateCart(previousData, false);
        }
        setIsCartMutating(false);
        console.error("Add to cart error:", error);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    [isAuthenticated, mutateCart, cartData]
  );

  // Update cart quantity with optimistic update
  const updateCartQuantity = useCallback(
    async (productId: string, quantity: number): Promise<{ success: boolean; error?: string }> => {
      if (!isAuthenticated) {
        return { success: false, error: "Please login" };
      }

      setIsCartMutating(true);
      const previousData = cartData;
      
      // Optimistic update
      if (cartData) {
        mutateCart({
          ...cartData,
          items: cartData.items.map(item =>
            item.product._id === productId
              ? { ...item, quantity, total: item.price * quantity }
              : item
          ),
        }, false);
      }

      try {
        const res = await fetch("/api/cart", {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({ productId, quantity }),
        });

        const data = await res.json();

        if (res.ok) {
          await mutateCart();
          setIsCartMutating(false);
          return { success: true };
        }
        
        // Revert on error
        if (previousData) {
          mutateCart(previousData, false);
        }
        setIsCartMutating(false);
        return { success: false, error: data.error || "Failed to update quantity" };
      } catch (error) {
        if (previousData) {
          mutateCart(previousData, false);
        }
        setIsCartMutating(false);
        console.error("Update cart error:", error);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    [isAuthenticated, mutateCart, cartData]
  );

  // Remove from cart with optimistic update
  const removeFromCart = useCallback(
    async (productId: string): Promise<{ success: boolean; error?: string }> => {
      if (!isAuthenticated) {
        return { success: false, error: "Please login" };
      }

      setIsCartMutating(true);
      const previousData = cartData;
      
      // Optimistic update - remove item immediately
      if (cartData) {
        mutateCart({
          ...cartData,
          items: cartData.items.filter(item => item.product._id !== productId),
        }, false);
      }

      try {
        const res = await fetch(`/api/cart?productId=${productId}`, {
          method: "DELETE",
          headers: {
            "Cache-Control": "no-cache",
          },
        });

        if (res.ok) {
          await mutateCart();
          setIsCartMutating(false);
          return { success: true };
        }
        
        // Revert on error
        if (previousData) {
          mutateCart(previousData, false);
        }
        setIsCartMutating(false);
        return { success: false, error: "Failed to remove item" };
      } catch (error) {
        if (previousData) {
          mutateCart(previousData, false);
        }
        setIsCartMutating(false);
        console.error("Remove from cart error:", error);
        return { success: false, error: "Network error. Please try again." };
      }
    },
    [isAuthenticated, mutateCart, cartData]
  );

  // Clear cart with optimistic update
  const clearCart = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated) {
      return { success: false, error: "Please login" };
    }

    setIsCartMutating(true);
    const previousData = cartData;
    
    // Optimistic update - clear immediately
    mutateCart({ items: [], total: 0, isB2B: cartData?.isB2B || false }, false);

    try {
      const res = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Cache-Control": "no-cache",
        },
      });

      if (res.ok) {
        await mutateCart();
        setIsCartMutating(false);
        return { success: true };
      }
      
      // Revert on error
      if (previousData) {
        mutateCart(previousData, false);
      }
      setIsCartMutating(false);
      return { success: false, error: "Failed to clear cart" };
    } catch (error) {
      if (previousData) {
        mutateCart(previousData, false);
      }
      setIsCartMutating(false);
      console.error("Clear cart error:", error);
      return { success: false, error: "Network error. Please try again." };
    }
  }, [isAuthenticated, mutateCart, cartData]);

  // Add to wishlist
  const addToWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!isAuthenticated) return false;

      try {
        const res = await fetch("/api/wishlist", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        });

        if (res.ok) {
          await mutateWishlist();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [isAuthenticated, mutateWishlist]
  );

  // Remove from wishlist
  const removeFromWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (!isAuthenticated) return false;

      try {
        const res = await fetch(`/api/wishlist?productId=${productId}`, {
          method: "DELETE",
        });

        if (res.ok) {
          await mutateWishlist();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [isAuthenticated, mutateWishlist]
  );

  // Toggle wishlist
  const toggleWishlist = useCallback(
    async (productId: string): Promise<boolean> => {
      if (isInWishlist(productId)) {
        return removeFromWishlist(productId);
      } else {
        return addToWishlist(productId);
      }
    },
    [isInWishlist, addToWishlist, removeFromWishlist]
  );

  // Refresh functions
  const refreshCart = useCallback(() => {
    mutateCart();
  }, [mutateCart]);

  const refreshWishlist = useCallback(() => {
    mutateWishlist();
  }, [mutateWishlist]);

  const value = useMemo(
    () => ({
      // Cart
      cart: cartData || null,
      cartCount,
      cartTotal,
      isCartLoading,
      isCartMutating,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
      // Wishlist
      wishlist: wishlistData || null,
      wishlistCount,
      isWishlistLoading,
      isInWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      refreshWishlist,
    }),
    [
      cartData,
      cartCount,
      cartTotal,
      isCartLoading,
      isCartMutating,
      addToCart,
      updateCartQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
      wishlistData,
      wishlistCount,
      isWishlistLoading,
      isInWishlist,
      addToWishlist,
      removeFromWishlist,
      toggleWishlist,
      refreshWishlist,
    ]
  );

  return (
    <CartWishlistContext.Provider value={value}>
      {children}
    </CartWishlistContext.Provider>
  );
}

export function useCartWishlist() {
  const context = useContext(CartWishlistContext);
  if (!context) {
    throw new Error("useCartWishlist must be used within CartWishlistProvider");
  }
  return context;
}

// Convenience hooks
export function useCart() {
  const {
    cart,
    cartCount,
    cartTotal,
    isCartLoading,
    isCartMutating,
    addToCart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    refreshCart,
  } = useCartWishlist();
  
  return {
    cart,
    cartCount,
    cartTotal,
    isLoading: isCartLoading,
    isMutating: isCartMutating,
    addToCart,
    updateQuantity: updateCartQuantity,
    removeItem: removeFromCart,
    clearCart,
    refresh: refreshCart,
  };
}

export function useWishlist() {
  const {
    wishlist,
    wishlistCount,
    isWishlistLoading,
    isInWishlist,
    addToWishlist,
    removeFromWishlist,
    toggleWishlist,
    refreshWishlist,
  } = useCartWishlist();
  
  return {
    wishlist,
    wishlistCount,
    isLoading: isWishlistLoading,
    isInWishlist,
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    toggle: toggleWishlist,
    refresh: refreshWishlist,
  };
}
