"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminSearch } from "@/hooks/useAdminSearch";

interface InventoryFiltersProps {
  currentFilter?: string;
  currentSort?: string;
}

export default function InventoryFilters({
  currentFilter,
  currentSort,
}: InventoryFiltersProps) {
  const { searchValue, setSearchValue, updateParam } = useAdminSearch(
    "/admin/inventory"
  );

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 pl-10"
        />
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          { value: "", label: "All" },
          { value: "out-of-stock", label: "Out of Stock" },
          { value: "low-stock", label: "Low Stock" },
          { value: "in-stock", label: "In Stock" },
        ].map(({ value, label }) => (
          <button
            key={value}
            onClick={() => updateParam("filter", value)}
            className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              (currentFilter ?? "") === value
                ? value === "out-of-stock"
                  ? "bg-destructive text-white"
                  : value === "low-stock"
                    ? "bg-stb-warning text-white"
                    : value === "in-stock"
                      ? "bg-stb-success text-white"
                      : "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
