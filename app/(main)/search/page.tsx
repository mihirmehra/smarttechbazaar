"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Search, Loader2, SlidersHorizontal, X } from "lucide-react";
import ProductCard from "@/components/products/ProductCard";
import { Button } from "@/components/ui/button";

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

interface SearchResult {
  products: Product[];
  total: number;
  page: number;
  totalPages: number;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";
  const { data: session } = useSession();
  
  const [results, setResults] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState("relevance");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) {
        setResults({ products: [], total: 0, page: 1, totalPages: 0 });
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams({
          search: query,
          page: page.toString(),
          limit: "20",
          sortBy,
        });

        const res = await fetch(`/api/products?${params}`);
        const data = await res.json();

        if (res.ok) {
          setResults({
            products: data.products || [],
            total: data.total || 0,
            page: data.page || 1,
            totalPages: data.totalPages || 0,
          });
        } else {
          setResults({ products: [], total: 0, page: 1, totalPages: 0 });
        }
      } catch (error) {
        console.error("Search error:", error);
        setResults({ products: [], total: 0, page: 1, totalPages: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [query, page, sortBy]);

  // Reset page when query changes
  useEffect(() => {
    setPage(1);
  }, [query]);

  const isB2B = session?.user?.isGstVerified === true;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Search Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Search className="h-4 w-4" />
            <span className="text-sm">Search results for</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            {query ? `"${query}"` : "All Products"}
          </h1>
          {results && (
            <p className="text-sm text-muted-foreground mt-1">
              {results.total} {results.total === 1 ? "result" : "results"} found
              {isB2B && <span className="ml-2 text-primary">(B2B Pricing)</span>}
            </p>
          )}
        </div>

        {/* Filters & Sort */}
        <div className="flex items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-2"
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {showFilters && <X className="h-3 w-3" />}
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 rounded-lg border border-border bg-white px-2 text-xs focus:border-primary focus:outline-none"
            >
              <option value="relevance">Relevance</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="newest">Newest First</option>
              <option value="name-asc">Name: A to Z</option>
            </select>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}

        {/* No Query */}
        {!loading && !query.trim() && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h2 className="text-lg font-semibold text-foreground">Enter a search term</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Search for products, brands, or categories
            </p>
            <Link href="/products" className="mt-4">
              <Button size="sm">Browse All Products</Button>
            </Link>
          </div>
        )}

        {/* No Results */}
        {!loading && query.trim() && results?.products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Search className="h-16 w-16 text-muted-foreground/20 mb-4" />
            <h2 className="text-lg font-semibold text-foreground">No results found</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Try different keywords or browse our categories
            </p>
            <div className="flex gap-3 mt-4">
              <Link href="/products">
                <Button size="sm">Browse All Products</Button>
              </Link>
              <Link href="/">
                <Button size="sm" variant="outline">Go Home</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Results Grid */}
        {!loading && results && results.products.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>

            {/* Pagination */}
            {results.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {results.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(results.totalPages, p + 1))}
                  disabled={page === results.totalPages}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
