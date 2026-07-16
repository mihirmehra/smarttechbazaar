"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminSearch } from "@/hooks/useAdminSearch";

interface Category {
  _id: string;
  name: string;
  slug: string;
}

interface ProductsFiltersProps {
  categories: Category[];
  currentCategory?: string;
  currentFilter?: string;
}

export default function ProductsFilters({
  categories,
  currentCategory,
  currentFilter,
}: ProductsFiltersProps) {
  const { searchValue, setSearchValue, updateParam } = useAdminSearch(
    "/admin/products"
  );

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Live search input */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search products by name or SKU..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 pl-10"
        />
      </div>

      {/* Category select — immediate */}
      <select
        value={currentCategory ?? ""}
        onChange={(e) => updateParam("category", e.target.value)}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm"
      >
        <option value="">All Categories</option>
        {categories.map((cat) => (
          <option key={cat._id} value={cat.slug}>
            {cat.name}
          </option>
        ))}
      </select>

      {/* Status filter — immediate */}
      <select
        value={currentFilter ?? ""}
        onChange={(e) => updateParam("filter", e.target.value)}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm"
      >
        <option value="">All Products</option>
        <option value="low-stock">Low Stock</option>
        <option value="out-of-stock">Out of Stock</option>
        <option value="featured">Featured</option>
      </select>
    </div>
  );
}
