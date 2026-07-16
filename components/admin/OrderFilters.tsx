"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAdminSearch } from "@/hooks/useAdminSearch";

const statusOptions = [
  { value: "", label: "All Status" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
  { value: "returned", label: "Returned" },
];

const paymentStatusOptions = [
  { value: "", label: "All Payments" },
  { value: "pending", label: "Pending" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

interface OrderFiltersProps {
  search?: string;
  status?: string;
  paymentStatus?: string;
}

export default function OrderFilters({ status, paymentStatus }: OrderFiltersProps) {
  const { searchValue, setSearchValue, updateParam } = useAdminSearch("/admin/orders");

  return (
    <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
      {/* Live search */}
      <div className="relative flex-1 min-w-48">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by order number, name, or phone..."
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
        {statusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Payment status — immediate */}
      <select
        value={paymentStatus ?? ""}
        onChange={(e) => updateParam("paymentStatus", e.target.value)}
        className="h-10 rounded-md border border-border bg-background px-3 text-sm"
      >
        {paymentStatusOptions.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
