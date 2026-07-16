"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminSearch } from "@/hooks/useAdminSearch";

export default function UsersFilters() {
  const { searchValue, setSearchValue } = useAdminSearch("/admin/users");

  return (
    <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search users by name or email..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="h-10 pl-10"
        />
      </div>
    </div>
  );
}
