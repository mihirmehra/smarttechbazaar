"use client";

import { useState, useMemo, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import ProductCard from "@/components/products/ProductCard";
import ProductFilterSidebar, { FilterState } from "@/components/products/ProductFilterSidebar";
import { SlidersHorizontal, Grid3X3, LayoutList, ChevronRight, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  category?: {
    _id: string;
    name: string;
    slug: string;
  };
  isFeatured?: boolean;
  isNewArrival?: boolean;
  isBestSeller?: boolean;
  tags?: string[];
}

interface Brand {
  _id?: string;
  name: string;
  slug?: string;
  productCount?: number;
}

interface Subcategory {
  _id: string;
  name: string;
  slug: string;
  productCount?: number;
}

interface CategoryPageClientProps {
  products: Product[];
  subcategories: Subcategory[];
  brands: (string | Brand)[];
  availableTags?: string[];
  maxPrice?: number;
  categorySlug?: string;
  categoryName?: string;
  isSubcategory?: boolean;
}

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "bestselling", label: "Best Selling" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

function sortProducts(products: Product[], sortBy: string): Product[] {
  const result = [...products];
  switch (sortBy) {
    case "price-asc":
      return result.sort((a, b) => a.priceB2C - b.priceB2C);
    case "price-desc":
      return result.sort((a, b) => b.priceB2C - a.priceB2C);
    case "bestselling":
      return result.sort((a, b) => (b.isBestSeller ? 1 : 0) - (a.isBestSeller ? 1 : 0));
    case "name-asc":
      return result.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return result.sort((a, b) => b.name.localeCompare(a.name));
    default:
      // relevance / newest: featured first
      return result.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
  }
}

// ─── Empty state for a section ──────────────────────────────────────────────
function EmptySection({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-xl border border-dashed border-border bg-white py-10 text-center">
      <div className="flex flex-col items-center gap-2">
        <Package className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-xs text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}

// ─── Product grid for a section ─────────────────────────────────────────────
function ProductGrid({
  products,
  gridCols,
}: {
  products: Product[];
  gridCols: 2 | 3;
}) {
  return (
    <div
      className={`grid gap-2.5 md:gap-3 ${
        gridCols === 3
          ? "grid-cols-3 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
          : "grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
      }`}
    >
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
}

// ─── Main component content ──────────────────────────────────────────────────
function CategoryPageContent({
  products,
  subcategories,
  brands,
  availableTags = [],
  maxPrice = 100000,
  categorySlug,
  categoryName,
  isSubcategory = false,
}: CategoryPageClientProps) {
  const searchParams = useSearchParams();
  const [filterOpen, setFilterOpen] = useState(false);
  const [gridCols, setGridCols] = useState<2 | 3>(2);
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "relevance");

  // Initialize filters from URL
  const [filters, setFilters] = useState<FilterState>(() => ({
    search: searchParams.get("search") || "",
    brands: searchParams.get("brands")?.split(",").filter(Boolean) || [],
    subcategories: searchParams.get("subcategories")?.split(",").filter(Boolean) || [],
    priceMin: Number(searchParams.get("priceMin")) || 0,
    priceMax: Number(searchParams.get("priceMax")) || maxPrice,
    inStock: searchParams.get("inStock") === "true",
    onSale: searchParams.get("onSale") === "true",
    featured: searchParams.get("featured") === "true",
    newArrivals: searchParams.get("newArrivals") === "true",
    bestSeller: searchParams.get("bestSeller") === "true",
    tags: searchParams.get("tags")?.split(",").filter(Boolean) || [],
    sortBy: searchParams.get("sortBy") || "relevance",
  }));

  const handleFilterChange = useCallback((newFilters: FilterState) => {
    setFilters(newFilters);
    setSortBy(newFilters.sortBy);
  }, []);

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value);
    setFilters((prev) => ({ ...prev, sortBy: value }));
  }, []);

  // Apply all filters to a given product list
  const applyFilters = useCallback(
    (list: Product[]): Product[] => {
      let result = [...list];

      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.brand?.toLowerCase().includes(q) ||
            p.tags?.some((t) => t.toLowerCase().includes(q))
        );
      }
      if (filters.brands.length > 0) {
        result = result.filter((p) => p.brand && filters.brands.includes(p.brand));
      }
      if (filters.priceMin > 0 || filters.priceMax < maxPrice) {
        result = result.filter(
          (p) => p.priceB2C >= filters.priceMin && p.priceB2C <= filters.priceMax
        );
      }
      if (filters.inStock) result = result.filter((p) => p.stock > 0);
      if (filters.onSale) result = result.filter((p) => p.mrp > p.priceB2C);
      if (filters.featured) result = result.filter((p) => p.isFeatured);
      if (filters.newArrivals) result = result.filter((p) => p.isNewArrival);
      if (filters.bestSeller) result = result.filter((p) => p.isBestSeller);
      if (filters.tags.length > 0) {
        result = result.filter((p) => p.tags?.some((t) => filters.tags.includes(t)));
      }

      return sortProducts(result, sortBy);
    },
    [filters, sortBy, maxPrice]
  );

  // ── For MAIN category: build sections ─────────────────────────────────────
  // "All" = filtered products, not further restricted by subcategory
  // Per subcategory = products whose category._id matches that subcategory
  const allFilteredProducts = useMemo(() => {
    // When subcategory filter is active, respect it; otherwise use everything
    let base = [...products];
    if (filters.subcategories.length > 0) {
      base = base.filter(
        (p) => p.category && filters.subcategories.includes(p.category._id)
      );
    }
    return applyFilters(base);
  }, [products, filters.subcategories, applyFilters]);

  // Products per subcategory (respects all filters EXCEPT the subcategory filter itself)
  const subcategorySections = useMemo(() => {
    // Determine which subcategories to show
    const visibleSubcats =
      filters.subcategories.length > 0
        ? subcategories.filter((s) => filters.subcategories.includes(s._id))
        : subcategories;

    return visibleSubcats.map((sub) => {
      const subProducts = products.filter(
        (p) => p.category && p.category._id === sub._id
      );
      const filtered = applyFilters(subProducts);
      return { sub, products: filtered, total: subProducts.length };
    });
  }, [subcategories, products, applyFilters, filters.subcategories]);

  // Count active filters
  const activeFiltersCount =
    filters.brands.length +
    filters.subcategories.length +
    filters.tags.length +
    (filters.inStock ? 1 : 0) +
    (filters.onSale ? 1 : 0) +
    (filters.featured ? 1 : 0) +
    (filters.newArrivals ? 1 : 0) +
    (filters.bestSeller ? 1 : 0) +
    (filters.priceMin > 0 || filters.priceMax < maxPrice ? 1 : 0) +
    (filters.search ? 1 : 0);

  // Products that appear in subcategory-less products (for main category "orphan" products)
  const orphanProducts = useMemo(() => {
    if (isSubcategory || subcategories.length === 0) return [];
    const subcatIds = new Set(subcategories.map((s) => s._id));
    const base = products.filter(
      (p) => !p.category || !subcatIds.has(p.category._id)
    );
    return applyFilters(base);
  }, [products, subcategories, isSubcategory, applyFilters]);

  return (
    <div className="mx-auto max-w-7xl px-3 py-3 md:px-4 md:py-5">
      {/* ── Sticky sort/filter bar ─────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 mb-4 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        {/* Row 1 — filter trigger + count + grid/sort controls */}
        <div className="flex min-w-0 items-center justify-between gap-2 px-3 py-2">
          {/* Mobile: Filter trigger */}
          <button
            onClick={() => setFilterOpen(true)}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-white px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:text-primary lg:hidden"
          >
            <SlidersHorizontal className="h-3 w-3" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge className="h-4 min-w-4 justify-center rounded-full px-1 text-[9px]">
                {activeFiltersCount}
              </Badge>
            )}
          </button>

          {/* Total count — truncates before overflowing */}
          <span className="min-w-0 truncate text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">{allFilteredProducts.length}</span>
            <span className="hidden sm:inline"> of {products.length}</span>
            {" "}products
            {activeFiltersCount > 0 && (
              <span className="ml-1 font-semibold text-primary">(filtered)</span>
            )}
          </span>

          <div className="flex shrink-0 items-center gap-1.5">
            {/* Grid toggle */}
            <div className="flex overflow-hidden rounded-lg border border-border">
              <button
                onClick={() => setGridCols(2)}
                aria-label="2-column grid"
                className={`flex h-7 w-7 items-center justify-center transition-colors ${
                  gridCols === 2 ? "bg-primary text-white" : "bg-white text-muted-foreground"
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setGridCols(3)}
                aria-label="3-column grid"
                className={`flex h-7 w-7 items-center justify-center transition-colors ${
                  gridCols === 3 ? "bg-primary text-white" : "bg-white text-muted-foreground"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Sort */}
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="h-8 w-[110px] text-[11px] md:w-[160px] md:text-xs">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="text-xs">
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* ── Main layout: sidebar + content ────────────────────────────────── */}
      <div className="flex gap-4">
        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 lg:block xl:w-60">
          <div className="sticky top-16 overflow-hidden rounded-xl border border-border bg-white shadow-sm">
            <ProductFilterSidebar
              brands={brands}
              subcategories={subcategories}
              availableTags={availableTags}
              maxPrice={maxPrice}
              onFilterChange={handleFilterChange}
              categorySlug={categorySlug}
              showSearch={true}
            />
          </div>
        </aside>

        {/* ── Content area ──────────────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-8">

          {/* ── SUBCATEGORY PAGE (flat list) ──────────────────────────────── */}
          {isSubcategory && (
            <>
              {allFilteredProducts.length === 0 ? (
                <EmptySection
                  message={
                    products.length === 0
                      ? "No products have been added to this category yet."
                      : "No products match your current filters."
                  }
                />
              ) : (
                <ProductGrid products={allFilteredProducts} gridCols={gridCols} />
              )}
            </>
          )}

          {/* ── MAIN CATEGORY PAGE (sectioned) ───────────────────────────── */}
          {!isSubcategory && (
            <>
              {/*
                Layout logic:
                - If NO subcategories exist → show a single flat grid of allFilteredProducts
                - If subcategories exist AND active non-subcategory filters are set
                  → show "All Results" flat section (because user is searching/filtering across subs)
                - If subcategories exist AND no cross-category filters active
                  → show per-subcategory sections + orphan section (no duplicate "All" header)
              */}
              {subcategories.length === 0 ? (
                /* No subcategories — flat list */
                <>
                  {allFilteredProducts.length === 0 ? (
                    <EmptySection
                      message={
                        products.length === 0
                          ? "No products have been added to this category yet."
                          : "No products match your current filters."
                      }
                    />
                  ) : (
                    <ProductGrid products={allFilteredProducts} gridCols={gridCols} />
                  )}
                </>
              ) : (() => {
                // Determine if cross-category filters are active (search, price, availability etc.)
                // Subcategory filter alone doesn't collapse into flat view — it just hides sections
                const hasCrossFilters =
                  filters.search ||
                  filters.inStock ||
                  filters.onSale ||
                  filters.featured ||
                  filters.newArrivals ||
                  filters.bestSeller ||
                  filters.brands.length > 0 ||
                  filters.tags.length > 0 ||
                  filters.priceMin > 0 ||
                  filters.priceMax < maxPrice;

                if (hasCrossFilters) {
                  // Flat "filtered results" view
                  return (
                    <section>
                      <div className="mb-3 flex items-center gap-2">
                        <h2 className="text-sm font-extrabold text-foreground md:text-base">
                          Filtered Results
                        </h2>
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                          {allFilteredProducts.length}
                        </span>
                      </div>
                      {allFilteredProducts.length === 0 ? (
                        <EmptySection message="No products match your current filters." />
                      ) : (
                        <ProductGrid products={allFilteredProducts} gridCols={gridCols} />
                      )}
                    </section>
                  );
                }

                // Sectioned view (default)
                const visibleSections = subcategorySections.filter(
                  ({ products: subProds, total }) => total > 0 || subProds.length > 0
                );
                const totalVisible = visibleSections.reduce(
                  (sum, s) => sum + s.products.length,
                  0
                );

                return (
                  <>
                    {/* Per-subcategory sections */}
                    {visibleSections.map(({ sub, products: subProds, total }) => (
                      <section key={sub._id} id={`subcategory-${sub._id}`}>
                        <div className="mb-3 flex items-center justify-between border-b border-border pb-2">
                          <div className="flex items-center gap-2">
                            <h2 className="text-sm font-extrabold text-foreground md:text-base">
                              {sub.name}
                            </h2>
                            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                              {subProds.length}
                              {subProds.length !== total && (
                                <span className="font-normal text-muted-foreground">
                                  {" "}/ {total}
                                </span>
                              )}
                            </span>
                          </div>
                          <Link
                            href={`/category/${sub.slug}`}
                            className="flex items-center gap-0.5 text-[11px] font-semibold text-primary hover:underline"
                          >
                            View all
                            <ChevronRight className="h-3.5 w-3.5" />
                          </Link>
                        </div>
                        {subProds.length === 0 ? (
                          <EmptySection
                            message={
                              total === 0
                                ? `No products added to ${sub.name} yet.`
                                : `No ${sub.name} products match your filters.`
                            }
                          />
                        ) : (
                          <ProductGrid products={subProds} gridCols={gridCols} />
                        )}
                      </section>
                    ))}

                    {/* Orphan products */}
                    {orphanProducts.length > 0 && (
                      <section>
                        <div className="mb-3 flex items-center gap-2 border-b border-border pb-2">
                          <h2 className="text-sm font-extrabold text-foreground md:text-base">
                            Other {categoryName}
                          </h2>
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                            {orphanProducts.length}
                          </span>
                        </div>
                        <ProductGrid products={orphanProducts} gridCols={gridCols} />
                      </section>
                    )}

                    {/* Completely empty */}
                    {totalVisible === 0 && orphanProducts.length === 0 && (
                      <EmptySection
                        message={
                          products.length === 0
                            ? "No products have been added to this category yet."
                            : "No products match your current filters."
                        }
                      />
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>

      {/* ── Mobile filter bottom sheet ────────────────────────────────────── */}
      {filterOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            onClick={() => setFilterOpen(false)}
          />
          <div className="animate-slide-up fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-hidden rounded-t-2xl bg-white shadow-2xl lg:hidden">
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-border" />
            <ProductFilterSidebar
              brands={brands}
              subcategories={subcategories}
              availableTags={availableTags}
              maxPrice={maxPrice}
              onFilterChange={handleFilterChange}
              onClose={() => setFilterOpen(false)}
              categorySlug={categorySlug}
              showSearch={true}
            />
          </div>
        </>
      )}
    </div>
  );
}

export default function CategoryPageClient(props: CategoryPageClientProps) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      }
    >
      <CategoryPageContent {...props} />
    </Suspense>
  );
}
