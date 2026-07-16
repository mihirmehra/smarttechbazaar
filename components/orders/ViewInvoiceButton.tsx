"use client";

import { useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import InvoiceView from "./InvoiceView";

interface ViewInvoiceButtonProps {
  orderId: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export default function ViewInvoiceButton({
  orderId,
  variant = "outline",
  size = "sm",
}: ViewInvoiceButtonProps) {
  const [loading, setLoading] = useState(false);
  const [invoice, setInvoice] = useState<unknown>(null);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`/api/orders/${orderId}/invoice`);
      const data = await res.json();

      if (res.ok && data.invoice) {
        setInvoice(data.invoice);
      } else {
        setError(data.error || "Failed to load invoice");
      }
    } catch (err) {
      setError("Failed to load invoice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        Invoice
      </Button>

      {error && (
        <span className="text-xs text-destructive ml-2">{error}</span>
      )}

      {invoice && (
        <InvoiceView
          invoice={invoice as Parameters<typeof InvoiceView>[0]["invoice"]}
          onClose={() => setInvoice(null)}
          orderId={orderId}
        />
      )}
    </>
  );
}
