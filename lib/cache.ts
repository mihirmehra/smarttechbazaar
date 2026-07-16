import { unstable_cache } from "next/cache";

// Cache tags for invalidation
export const CACHE_TAGS = {
  products: "products",
  categories: "categories",
  brands: "brands",
  banners: "banners",
  settings: "settings",
  orders: "orders",
  users: "users",
} as const;

// Cache durations in seconds
export const CACHE_DURATIONS = {
  short: 30, // 30 seconds - for frequently changing data
  medium: 60, // 1 minute - for moderately changing data
  long: 300, // 5 minutes - for rarely changing data
  veryLong: 600, // 10 minutes - for almost static data
} as const;

// Helper to create cached functions with proper typing
export function createCachedFunction<T extends (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>>(
  fn: T,
  keyParts: string[],
  options: {
    revalidate?: number;
    tags?: string[];
  } = {}
) {
  return unstable_cache(fn, keyParts, {
    revalidate: options.revalidate ?? CACHE_DURATIONS.medium,
    tags: options.tags ?? [],
  });
}

// In-memory cache for expensive computations (server-side only)
const memoryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();

export function getFromMemoryCache<T>(key: string): T | null {
  const cached = memoryCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    memoryCache.delete(key);
    return null;
  }
  
  return cached.data as T;
}

export function setInMemoryCache<T>(key: string, data: T, ttlMs: number = 60000): void {
  // Limit cache size to prevent memory issues
  if (memoryCache.size > 100) {
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  
  memoryCache.set(key, { data, timestamp: Date.now(), ttl: ttlMs });
}

export function invalidateMemoryCache(keyPattern?: string): void {
  if (!keyPattern) {
    memoryCache.clear();
    return;
  }
  
  for (const key of memoryCache.keys()) {
    if (key.includes(keyPattern)) {
      memoryCache.delete(key);
    }
  }
}
