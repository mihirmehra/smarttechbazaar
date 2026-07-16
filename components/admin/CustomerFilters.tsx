"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminSearch } from "@/hooks/useAdminSearch";

interface CustomerFiltersProps {
  search?: string;
  status?: string;
}

export default function CustomerFilters({ status }: CustomerFiltersProps) {
  const { searchValue, setSearchValue, updateParam } = useAdminSearch("/admin/customers");

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Live search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 pl-10"
        />
      </div>

      {/* Status — immediate */}
      <select
        value={status ?? ""}
        onChange={(e) => updateParam("status", e.target.value)}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm"
      >
        <option value="">All Status</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
      </select>
    </div>
  );
}
