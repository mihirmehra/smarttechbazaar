"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Separator } from "@/components/ui/separator";

interface CategoryFiltersProps {
  subcategories: Array<{ _id: string; name: string; slug: string }>;
  brands: string[];
  onClose?: () => void;
}

const PRICE_RANGES = [
  { label: "Under ₹1,000", range: [0, 1000] as [number, number] },
  { label: "₹1K – ₹5K", range: [1000, 5000] as [number, number] },
  { label: "₹5K – ₹10K", range: [5000, 10000] as [number, number] },
  { label: "Above ₹10K", range: [10000, 100000] as [number, number] },
];

export default function CategoryFilters({ subcategories, brands, onClose }: CategoryFiltersProps) {
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [openSections, setOpenSections] = useState({ subcategories: true, price: true, brands: true });

  const toggle = (key: keyof typeof openSections) =>
    setOpenSections((p) => ({ ...p, [key]: !p[key] }));

  const toggleBrand = (b: string) =>
    setSelectedBrands((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);

  const clearAll = () => {
    setPriceRange([0, 100000]);
    setSelectedBrands([]);
    setInStockOnly(false);
  };

  const activeCount = selectedBrands.length + (inStockOnly ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 100000 ? 1 : 0);

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-foreground">Filters</span>
          {activeCount > 0 && (
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[9px] font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {activeCount > 0 && (
            <button
              onClick={clearAll}
              className="text-[10px] font-semibold text-primary hover:underline"
            >
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

      <div className="px-4 py-2">
        {/* Subcategories */}
        {subcategories.length > 0 && (
          <>
            <div className="py-2.5">
              <button
                onClick={() => toggle("subcategories")}
                className="flex w-full items-center justify-between"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">Subcategory</span>
                {openSections.subcategories
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {openSections.subcategories && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {subcategories.map((s) => (
                    <label key={s._id} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                      <span className="text-[11px] text-foreground">{s.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Price Range */}
        <div className="py-2.5">
          <button
            onClick={() => toggle("price")}
            className="flex w-full items-center justify-between"
          >
            <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">Price</span>
            {openSections.price
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
          </button>
          {openSections.price && (
            <div className="mt-2 space-y-2">
              {/* Quick-select pills */}
              <div className="flex flex-wrap gap-1.5">
                {PRICE_RANGES.map((item) => {
                  const active = priceRange[0] === item.range[0] && priceRange[1] === item.range[1];
                  return (
                    <button
                      key={item.label}
                      onClick={() => setPriceRange(active ? [0, 100000] : item.range)}
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium transition-all ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-border text-muted-foreground hover:border-primary hover:text-primary"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
              {/* Min-Max inputs */}
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  placeholder="Min"
                  value={priceRange[0] || ""}
                  onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                  className="min-w-0 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] focus:border-primary focus:outline-none"
                />
                <span className="shrink-0 text-[10px] text-muted-foreground">–</span>
                <input
                  type="number"
                  placeholder="Max"
                  value={priceRange[1] || ""}
                  onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                  className="min-w-0 w-full rounded-lg border border-border bg-background px-2 py-1.5 text-[11px] focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
        <Separator />

        {/* Brands */}
        {brands.length > 0 && (
          <>
            <div className="py-2.5">
              <button
                onClick={() => toggle("brands")}
                className="flex w-full items-center justify-between"
              >
                <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">Brand</span>
                {openSections.brands
                  ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                  : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
              </button>
              {openSections.brands && (
                <div className="mt-2 flex flex-col gap-1.5">
                  {brands.map((b) => (
                    <label key={b} className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(b)}
                        onChange={() => toggleBrand(b)}
                        className="h-3.5 w-3.5 rounded border-border accent-primary"
                      />
                      <span className="text-[11px] text-foreground">{b}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Separator />
          </>
        )}

        {/* Availability */}
        <div className="py-2.5">
          <span className="text-[11px] font-bold uppercase tracking-wide text-foreground">Availability</span>
          <div className="mt-2 flex flex-col gap-1.5">
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border accent-primary"
              />
              <span className="text-[11px] text-foreground">In Stock Only</span>
            </label>
          </div>
        </div>
      </div>

      {/* Apply button — mobile */}
      {onClose && (
        <div className="sticky bottom-0 border-t border-border bg-white px-4 py-3 md:hidden">
          <button
            onClick={onClose}
            className="w-full rounded-lg bg-primary py-2.5 text-xs font-bold text-white hover:bg-stb-red-dark"
          >
            Apply Filters
          </button>
        </div>
      )}
    </div>
  );
}
