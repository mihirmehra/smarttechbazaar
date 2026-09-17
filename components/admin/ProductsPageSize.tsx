"use client";

import { useAdminSearch } from "@/hooks/useAdminSearch";

const PAGE_SIZE_OPTIONS = ["20", "30", "40", "50", "60", "70", "80", "90", "all"];

interface ProductsPageSizeProps {
  currentPageSize?: string;
}

export default function ProductsPageSize({ currentPageSize }: ProductsPageSizeProps) {
  const { updateParam } = useAdminSearch("/admin/products");

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="page-size" className="body-sm text-muted-foreground">
        Show
      </label>
      <select
        id="page-size"
        value={currentPageSize ?? "20"}
        onChange={(e) => updateParam("pageSize", e.target.value === "20" ? "" : e.target.value)}
        className="h-9 rounded-md border border-border bg-background px-3 text-sm"
      >
        {PAGE_SIZE_OPTIONS.map((opt) => (
          <option key={opt} value={opt}>
            {opt === "all" ? "All" : opt}
          </option>
        ))}
      </select>
      <span className="body-sm text-muted-foreground">per page</span>
    </div>
  );
}
