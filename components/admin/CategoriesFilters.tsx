"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminSearch } from "@/hooks/useAdminSearch";

export default function CategoriesFilters({
  currentParent,
}: {
  currentParent?: string;
}) {
  const { searchValue, setSearchValue, updateParam } = useAdminSearch(
    "/admin/categories"
  );

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search categories..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 pl-10"
        />
      </div>

      <button
        onClick={() => updateParam("parent", "")}
        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          !currentParent
            ? "bg-primary text-white"
            : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        All
      </button>
      <button
        onClick={() => updateParam("parent", "root")}
        className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
          currentParent === "root"
            ? "bg-primary text-white"
            : "bg-muted text-muted-foreground hover:text-foreground"
        }`}
      >
        Root Only
      </button>
    </div>
  );
}
