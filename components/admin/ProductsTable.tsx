"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Edit, Eye, Loader2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import { formatPrice } from "@/lib/pricing";

interface ProductRow {
  _id: string;
  name: string;
  slug: string;
  sku: string;
  thumbnailUrl?: string | null;
  hasEmbeddedImage?: boolean;
  category?: { name: string; slug: string };
  priceB2C: number;
  priceB2B: number;
  stock: number;
  isActive: boolean;
  isFeatured: boolean;
}

interface ProductsTableProps {
  products: ProductRow[];
  error?: string | null;
}

type PriceField = "priceB2C" | "priceB2B" | "mrp";
type UpdateMode =
  | "set"
  | "increase_amount"
  | "decrease_amount"
  | "increase_percent"
  | "decrease_percent";

const FIELD_LABELS: Record<PriceField, string> = {
  priceB2C: "B2C Price",
  priceB2B: "B2B Price",
  mrp: "MRP",
};

const MODE_LABELS: Record<UpdateMode, string> = {
  set: "Set to exact value",
  increase_amount: "Increase by amount (₹)",
  decrease_amount: "Decrease by amount (₹)",
  increase_percent: "Increase by percent (%)",
  decrease_percent: "Decrease by percent (%)",
};

export default function ProductsTable({ products, error }: ProductsTableProps) {
  const router = useRouter();
  // Local copy of the rows so bulk price edits can be reflected in-place
  // without a full page refresh. Re-syncs whenever the server sends new data
  // (navigation, filter change, pagination).
  const [rows, setRows] = useState<ProductRow[]>(products);
  useEffect(() => {
    setRows(products);
  }, [products]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [showDialog, setShowDialog] = useState(false);
  const [field, setField] = useState<PriceField>("priceB2C");
  const [mode, setMode] = useState<UpdateMode>("increase_percent");
  const [value, setValue] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(null);

  const allSelected = products.length > 0 && selected.size === products.length;
  const someSelected = selected.size > 0 && selected.size < products.length;

  const selectedIds = useMemo(() => Array.from(selected), [selected]);

  const toggleAll = () => {
    setSelected((prev) =>
      prev.size === products.length ? new Set() : new Set(products.map((p) => p._id))
    );
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleApply = async () => {
    setFeedback(null);
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
      setFeedback({ type: "error", text: "Enter a valid non-negative value." });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/products/bulk-price", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedIds, field, mode, value: numeric }),
      });
      const data = await res.json();

      if (!res.ok) {
        setFeedback({ type: "error", text: data.error || "Failed to update prices." });
        return;
      }

      // Reflect the new prices in-place, mirroring the server's computation
      // exactly (see /api/admin/products/bulk-price), so the visible price
      // fields update immediately without a full page refresh.
      const round2 = (n: number) => Math.round(n * 100) / 100;
      const computeNext = (current: number) => {
        let next = current;
        switch (mode) {
          case "set":
            next = numeric;
            break;
          case "increase_amount":
            next = current + numeric;
            break;
          case "decrease_amount":
            next = current - numeric;
            break;
          case "increase_percent":
            next = current * (1 + numeric / 100);
            break;
          case "decrease_percent":
            next = current * (1 - numeric / 100);
            break;
        }
        return Math.max(0, round2(next));
      };

      // MRP is not shown in the table, so only patch the displayed fields.
      if (field === "priceB2C" || field === "priceB2B") {
        const selectedSet = new Set(selectedIds);
        setRows((prev) =>
          prev.map((row) =>
            selectedSet.has(row._id)
              ? { ...row, [field]: computeNext(row[field]) }
              : row
          )
        );
      }

      setFeedback({ type: "success", text: data.message || "Prices updated." });
      setSelected(new Set());
      setValue("");
      // Refresh server data in the background so caches stay in sync, without
      // clearing the just-updated view the admin is looking at.
      router.refresh();
      setTimeout(() => {
        setShowDialog(false);
        setFeedback(null);
      }, 900);
    } catch {
      setFeedback({ type: "error", text: "Failed to update prices." });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      {/* Bulk action toolbar — appears only when rows are selected */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <p className="body-sm font-medium text-foreground">
            {selected.size} product{selected.size === 1 ? "" : "s"} selected
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={() => setShowDialog(true)}>
              Update Price
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="w-10 px-4 py-3 text-left">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Select all products"
                    disabled={products.length === 0}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  B2C Price
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  B2B Price
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Stock
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length > 0 ? (
                rows.map((product) => {
                  const isChecked = selected.has(product._id);
                  return (
                    <tr
                      key={product._id}
                      className={isChecked ? "bg-primary/5" : "hover:bg-muted/30"}
                    >
                      <td className="px-4 py-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleOne(product._id)}
                          aria-label={`Select ${product.name}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                            {product.thumbnailUrl || product.hasEmbeddedImage ? (
                              <Image
                                src={
                                  product.thumbnailUrl ??
                                  `/api/admin/products/${product._id}/thumbnail`
                                }
                                alt={product.name}
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                                unoptimized
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                                <Eye className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground line-clamp-1">
                              {product.name}
                            </p>
                            {product.isFeatured && (
                              <Badge variant="secondary" className="mt-1 text-xs">
                                Featured
                              </Badge>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                        {product.sku}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {product.category?.name || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatPrice(product.priceB2C)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-blue-600">
                        {formatPrice(product.priceB2B)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                            product.stock === 0
                              ? "bg-destructive/10 text-destructive"
                              : product.stock < 10
                                ? "bg-stb-warning/10 text-stb-warning"
                                : "bg-stb-success/10 text-stb-success"
                          }`}
                        >
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge
                          variant={product.isActive ? "default" : "secondary"}
                          className={
                            product.isActive ? "bg-stb-success/10 text-stb-success" : ""
                          }
                        >
                          {product.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/product/${product.slug}`}
                            target="_blank"
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/admin/products/${product._id}/edit`}
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          <DeleteProductButton
                            productId={product._id}
                            productName={product.name}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    {error ? (
                      <p className="text-muted-foreground">
                        Products could not be loaded. See the error above.
                      </p>
                    ) : (
                      <>
                        <p className="text-muted-foreground">No products found</p>
                        <Link
                          href="/admin/products/new"
                          className="mt-2 inline-flex items-center gap-2 text-primary hover:underline"
                        >
                          Add your first product
                        </Link>
                      </>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk price update dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="heading-md text-foreground">Bulk Update Price</h3>
                <p className="body-sm mt-1 text-muted-foreground">
                  Applying to {selected.size} selected product
                  {selected.size === 1 ? "" : "s"}.
                </p>
              </div>
              <button
                onClick={() => setShowDialog(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="body-sm font-medium text-foreground">
                  Price field
                </label>
                <select
                  value={field}
                  onChange={(e) => setField(e.target.value as PriceField)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  {(Object.keys(FIELD_LABELS) as PriceField[]).map((f) => (
                    <option key={f} value={f}>
                      {FIELD_LABELS[f]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="body-sm font-medium text-foreground">
                  Adjustment
                </label>
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value as UpdateMode)}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                >
                  {(Object.keys(MODE_LABELS) as UpdateMode[]).map((m) => (
                    <option key={m} value={m}>
                      {MODE_LABELS[m]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="body-sm font-medium text-foreground">
                  {mode.endsWith("percent") ? "Percentage" : "Amount"}
                </label>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={mode.endsWith("percent") ? "e.g. 10" : "e.g. 500"}
                  className="h-10 rounded-md border border-border bg-background px-3 text-sm"
                />
              </div>

              {feedback && (
                <p
                  className={`body-sm ${
                    feedback.type === "error" ? "text-destructive" : "text-stb-success"
                  }`}
                >
                  {feedback.text}
                </p>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => setShowDialog(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={isSaving} className="gap-2">
                {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
