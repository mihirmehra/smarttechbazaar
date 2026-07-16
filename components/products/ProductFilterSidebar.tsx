"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, X, Search, RotateCcw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export interface FilterState {
  search: string;
  brands: string[];
  subcategories: string[];
  priceMin: number;
  priceMax: number;
  inStock: boolean;
  onSale: boolean;
  featured: boolean;
  newArrivals: boolean;
  bestSeller: boolean;
  tags: string[];
  sortBy: string;
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

interface ProductFilterSidebarProps {
  brands: (string | Brand)[];
  subcategories?: Subcategory[];
  availableTags?: string[];
  maxPrice?: number;
  onFilterChange?: (filters: FilterState) => void;
  onClose?: () => void;
  categorySlug?: string;
  showSearch?: boolean;
}

const PRICE_RANGES = [
  { label: "Under ₹500", min: 0, max: 500 },
  { label: "₹500 - ₹1K", min: 500, max: 1000 },
  { label: "₹1K - ₹5K", min: 1000, max: 5000 },
  { label: "₹5K - ₹10K", min: 5000, max: 10000 },
  { label: "₹10K - ₹25K", min: 10000, max: 25000 },
  { label: "₹25K - ₹50K", min: 25000, max: 50000 },
  { label: "Above ₹50K", min: 50000, max: 500000 },
];

const SORT_OPTIONS = [
  { value: "relevance", label: "Relevance" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
  { value: "bestselling", label: "Best Selling" },
  { value: "name-asc", label: "Name: A to Z" },
  { value: "name-desc", label: "Name: Z to A" },
];

export default function ProductFilterSidebar({
  brands,
  subcategories = [],
  availableTags = [],
  maxPrice = 100000,
  onFilterChange,
  onClose,
  categorySlug,
  showSearch = true,
}: ProductFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  const [priceRange, setPriceRange] = useState<[number, number]>([
    filters.priceMin,
    filters.priceMax,
  ]);

  const [openSections, setOpenSections] = useState({
    subcategories: true,
    brands: true,
    price: true,
    availability: true,
    tags: availableTags.length > 0,
  });

  const [brandSearch, setBrandSearch] = useState("");

  // Normalize brands to always have name property
  const normalizedBrands: Brand[] = brands.map((b) =>
    typeof b === "string" ? { name: b } : b
  );

  // Filter brands by search
  const filteredBrands = normalizedBrands.filter((b) =>
    b.name.toLowerCase().includes(brandSearch.toLowerCase())
  );

  // Update URL with filters
  const updateURL = useCallback(
    (newFilters: FilterState) => {
      const params = new URLSearchParams();

      if (newFilters.search) params.set("search", newFilters.search);
      if (newFilters.brands.length) params.set("brands", newFilters.brands.join(","));
      if (newFilters.subcategories.length) params.set("subcategories", newFilters.subcategories.join(","));
      if (newFilters.priceMin > 0) params.set("priceMin", String(newFilters.priceMin));
      if (newFilters.priceMax < maxPrice) params.set("priceMax", String(newFilters.priceMax));
      if (newFilters.inStock) params.set("inStock", "true");
      if (newFilters.onSale) params.set("onSale", "true");
      if (newFilters.featured) params.set("featured", "true");
      if (newFilters.newArrivals) params.set("newArrivals", "true");
      if (newFilters.bestSeller) params.set("bestSeller", "true");
      if (newFilters.tags.length) params.set("tags", newFilters.tags.join(","));
      if (newFilters.sortBy !== "relevance") params.set("sortBy", newFilters.sortBy);

      const queryString = params.toString();
      router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
    },
    [pathname, router, maxPrice]
  );

  // Handle filter change
  const handleFilterChange = useCallback(
    <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
      setFilters((prev) => {
        const newFilters = { ...prev, [key]: value };
        updateURL(newFilters);
        onFilterChange?.(newFilters);
        return newFilters;
      });
    },
    [updateURL, onFilterChange]
  );

  // Toggle array items (brands, subcategories, tags)
  const toggleArrayItem = useCallback(
    (key: "brands" | "subcategories" | "tags", item: string) => {
      setFilters((prev) => {
        const arr = prev[key];
        const newArr = arr.includes(item)
          ? arr.filter((x) => x !== item)
          : [...arr, item];
        const newFilters = { ...prev, [key]: newArr };
        updateURL(newFilters);
        onFilterChange?.(newFilters);
        return newFilters;
      });
    },
    [updateURL, onFilterChange]
  );

  // Apply price range
  const applyPriceRange = useCallback(() => {
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        priceMin: priceRange[0],
        priceMax: priceRange[1],
      };
      updateURL(newFilters);
      onFilterChange?.(newFilters);
      return newFilters;
    });
  }, [priceRange, updateURL, onFilterChange]);

  // Quick select price range
  const selectPriceRange = useCallback(
    (min: number, max: number) => {
      const isActive = filters.priceMin === min && filters.priceMax === max;
      const newMin = isActive ? 0 : min;
      const newMax = isActive ? maxPrice : max;
      setPriceRange([newMin, newMax]);
      setFilters((prev) => {
        const newFilters = { ...prev, priceMin: newMin, priceMax: newMax };
        updateURL(newFilters);
        onFilterChange?.(newFilters);
        return newFilters;
      });
    },
    [filters.priceMin, filters.priceMax, maxPrice, updateURL, onFilterChange]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    const defaultFilters: FilterState = {
      search: "",
      brands: [],
      subcategories: [],
      priceMin: 0,
      priceMax: maxPrice,
      inStock: false,
      onSale: false,
      featured: false,
      newArrivals: false,
      bestSeller: false,
      tags: [],
      sortBy: "relevance",
    };
    setFilters(defaultFilters);
    setPriceRange([0, maxPrice]);
    updateURL(defaultFilters);
    onFilterChange?.(defaultFilters);
  }, [maxPrice, updateURL, onFilterChange]);

  // Toggle section
  const toggleSection = (key: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

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

  // Note: intentionally NOT calling onFilterChange on mount.
  // The parent (CategoryPageClient) initialises its own filters from searchParams
  // independently, so firing here would cause a state-desync race on first render.

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Filters</span>
          {activeFiltersCount > 0 && (
            <Badge variant="default" className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[10px]">
              {activeFiltersCount}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeFiltersCount > 0 && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
            >
              <RotateCcw className="h-3 w-3" />
              Clear all
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="flex h-6 w-6 items-center justify-center rounded-full bg-muted hover:bg-border md:hidden"
            >
              <X className="h-3.5 w-3.5 text-foreground" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2">
        {/* Search */}
        {showSearch && (
          <>
            <div className="py-2.5">
              <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                Search
              </span>
              <div className="relative mt-2">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="h-8 pl-8 text-xs"
                />
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Subcategories */}
        {subcategories.length > 0 && (
          <>
            <div className="py-2.5">
              <button
                onClick={() => toggleSection("subcategories")}
                className="flex w-full items-center justify-between"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                  Subcategory
                </span>
                {openSections.subcategories ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {openSections.subcategories && (
                <div className="mt-2 flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                  {subcategories.map((sub) => (
                    <label
                      key={sub._id}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Checkbox
                        checked={filters.subcategories.includes(sub._id)}
                        onCheckedChange={() => toggleArrayItem("subcategories", sub._id)}
                        className="h-3.5 w-3.5"
                      />
                      <span className="flex-1 text-[11px] text-foreground">
                        {sub.name}
                      </span>
                      {sub.productCount !== undefined && (
                        <span className="text-[10px] text-muted-foreground">
                          ({sub.productCount})
                        </span>
                      )}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Brands */}
        {normalizedBrands.length > 0 && (
          <>
            <div className="py-2.5">
              <button
                onClick={() => toggleSection("brands")}
                className="flex w-full items-center justify-between"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                  Brand
                </span>
                {openSections.brands ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {openSections.brands && (
                <div className="mt-2 space-y-2">
                  {/* Brand search */}
                  {normalizedBrands.length > 5 && (
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        placeholder="Search brands..."
                        value={brandSearch}
                        onChange={(e) => setBrandSearch(e.target.value)}
                        className="h-7 pl-7 text-[10px]"
                      />
                    </div>
                  )}
                  <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto">
                    {filteredBrands.map((brand, idx) => (
                      <label
                        key={brand._id || brand.name + idx}
                        className="flex cursor-pointer items-center gap-2"
                      >
                        <Checkbox
                          checked={filters.brands.includes(brand.name)}
                          onCheckedChange={() => toggleArrayItem("brands", brand.name)}
                          className="h-3.5 w-3.5"
                        />
                        <span className="flex-1 text-[11px] text-foreground">
                          {brand.name}
                        </span>
                        {brand.productCount !== undefined && (
                          <span className="text-[10px] text-muted-foreground">
                            ({brand.productCount})
                          </span>
                        )}
                      </label>
                    ))}
                    {filteredBrands.length === 0 && (
                      <p className="text-[10px] text-muted-foreground">
                        No brands found
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Price Range */}
        <div className="py-2.5">
          <button
            onClick={() => toggleSection("price")}
            className="flex w-full items-center justify-between"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
              Price Range
            </span>
            {openSections.price ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          {openSections.price && (
            <div className="mt-2 space-y-3">
              {/* Quick select pills */}
              <div className="flex flex-wrap gap-1">
                {PRICE_RANGES.map((range) => {
                  const isActive =
                    filters.priceMin === range.min && filters.priceMax === range.max;
                  return (
                    <button
                      key={range.label}
                      onClick={() => selectPriceRange(range.min, range.max)}
                      className={`rounded-full border px-2 py-0.5 text-[9px] font-medium transition-all ${
                        isActive
                          ? "border-primary bg-primary text-white"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {range.label}
                    </button>
                  );
                })}
              </div>

              {/* Slider — applies immediately on pointer-up via onValueCommit */}
              <div className="px-1">
                <Slider
                  value={priceRange}
                  onValueChange={(val) => setPriceRange([val[0], val[1]])}
                  onValueCommit={(val) => {
                    setPriceRange([val[0], val[1]]);
                    setFilters((prev) => {
                      const newFilters = { ...prev, priceMin: val[0], priceMax: val[1] };
                      updateURL(newFilters);
                      onFilterChange?.(newFilters);
                      return newFilters;
                    });
                  }}
                  min={0}
                  max={maxPrice}
                  step={100}
                  className="w-full"
                />
              </div>

              {/* Min-Max inputs */}
              <div className="flex items-center gap-1.5">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0] || ""}
                  onChange={(e) =>
                    setPriceRange([Number(e.target.value), priceRange[1]])
                  }
                  className="h-7 text-[10px]"
                />
                <span className="shrink-0 text-[10px] text-muted-foreground">–</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1] || ""}
                  onChange={(e) =>
                    setPriceRange([priceRange[0], Number(e.target.value)])
                  }
                  className="h-7 text-[10px]"
                />
              </div>

              <Button
                size="sm"
                variant="outline"
                className="h-7 w-full text-[10px]"
                onClick={applyPriceRange}
              >
                Apply Price
              </Button>
            </div>
          )}
        </div>
        <Separator />

        {/* Availability & Features */}
        <div className="py-2.5">
          <button
            onClick={() => toggleSection("availability")}
            className="flex w-full items-center justify-between"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
              Availability & Features
            </span>
            {openSections.availability ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </button>
          {openSections.availability && (
            <div className="mt-2 flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={filters.inStock}
                  onCheckedChange={(checked) =>
                    handleFilterChange("inStock", checked === true)
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] text-foreground">In Stock Only</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={filters.onSale}
                  onCheckedChange={(checked) =>
                    handleFilterChange("onSale", checked === true)
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] text-foreground">On Sale</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={filters.featured}
                  onCheckedChange={(checked) =>
                    handleFilterChange("featured", checked === true)
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] text-foreground">Featured</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={filters.newArrivals}
                  onCheckedChange={(checked) =>
                    handleFilterChange("newArrivals", checked === true)
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] text-foreground">New Arrivals</span>
              </label>
              <label className="flex cursor-pointer items-center gap-2">
                <Checkbox
                  checked={filters.bestSeller}
                  onCheckedChange={(checked) =>
                    handleFilterChange("bestSeller", checked === true)
                  }
                  className="h-3.5 w-3.5"
                />
                <span className="text-[11px] text-foreground">Best Seller</span>
              </label>
            </div>
          )}
        </div>

        {/* Tags */}
        {availableTags.length > 0 && (
          <>
            <Separator />
            <div className="py-2.5">
              <button
                onClick={() => toggleSection("tags")}
                className="flex w-full items-center justify-between"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">
                  Tags
                </span>
                {openSections.tags ? (
                  <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </button>
              {openSections.tags && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {availableTags.map((tag) => {
                    const isActive = filters.tags.includes(tag);
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleArrayItem("tags", tag)}
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-medium transition-all ${
                          isActive
                            ? "border-primary bg-primary text-white"
                            : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                        }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Apply button - mobile only */}
      {onClose && (
        <div className="sticky bottom-0 border-t border-border bg-white px-4 py-3 md:hidden">
          <Button onClick={onClose} className="w-full text-xs">
            Apply Filters
            {activeFiltersCount > 0 && ` (${activeFiltersCount})`}
          </Button>
        </div>
      )}
    </div>
  );
}
