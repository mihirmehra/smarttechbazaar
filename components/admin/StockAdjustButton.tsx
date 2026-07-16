"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Minus, Loader2, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StockAdjustButtonProps {
  productId: string;
  productName: string;
  currentStock: number;
}

export default function StockAdjustButton({
  productId,
  productName,
  currentStock,
}: StockAdjustButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adjustType, setAdjustType] = useState<"add" | "subtract" | "set">("add");
  const [quantity, setQuantity] = useState(0);
  const [reason, setReason] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`/api/admin/inventory/${productId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Always send the raw positive number. The API route handles the
          // arithmetic based on `type`, so pre-negating here caused the API's
          // own subtraction to flip it back to a positive (double-negation bug).
          quantity: quantity,
          type: adjustType,
          reason,
          actionType: adjustType === "set" ? "adjustment" : adjustType === "add" ? "purchase" : "adjustment",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to adjust stock");
      }

      // Close modal and reset form first
      setIsOpen(false);
      setQuantity(0);
      setReason("");

      // router.refresh() invalidates the Next.js client-side RSC payload cache
      // so the subsequent router.push actually re-fetches from the server instead
      // of serving the stale cached RSC payload. window.location.reload() was
      // broken because browsers served a cached HTML response without hitting
      // the server at all.
      router.refresh();
      router.push(window.location.pathname + window.location.search);
    } catch (error) {
      console.error("Error adjusting stock:", error);
      alert(error instanceof Error ? error.message : "Failed to adjust stock");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getNewStock = () => {
    if (adjustType === "set") return quantity;
    if (adjustType === "add") return currentStock + quantity;
    return currentStock - quantity;
  };

  if (isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="mx-4 w-full max-w-md rounded-xl bg-card p-6 shadow-xl">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-semibold">Adjust Stock</h3>
              <p className="text-sm text-muted-foreground line-clamp-1">{productName}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium">Current Stock</label>
              <div className="rounded-md bg-muted px-3 py-2 text-sm font-bold">
                {currentStock} units
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Adjustment Type</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType("add")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    adjustType === "add"
                      ? "bg-stb-success text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Plus className="h-4 w-4" />
                  Add
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("subtract")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    adjustType === "subtract"
                      ? "bg-destructive text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Minus className="h-4 w-4" />
                  Subtract
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType("set")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                    adjustType === "set"
                      ? "bg-primary text-white"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Set
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">
                {adjustType === "set" ? "New Stock Quantity" : "Quantity"}
              </label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 0)}
                min={0}
                required
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium">Reason (Optional)</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., New shipment received, Damaged goods, Inventory count adjustment"
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="rounded-md bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">New Stock:</span>
                <span className={`font-bold ${getNewStock() < 0 ? "text-destructive" : "text-foreground"}`}>
                  {getNewStock()} units
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || getNewStock() < 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Stock"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={() => setIsOpen(true)}
      className="rounded-md bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
      title="Adjust stock"
    >
      <Package className="h-4 w-4" />
    </button>
  );
}
