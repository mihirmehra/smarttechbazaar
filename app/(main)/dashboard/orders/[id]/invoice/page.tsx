"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Printer,
  FileText,
  Share2,
  Loader2,
  CheckCircle,
  Copy,
  ExternalLink,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import InvoiceView from "@/components/orders/InvoiceView";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { shareContent } from "@/lib/mobile-utils";

interface InvoiceData {
  invoiceNumber: string;
  invoiceDate: string;
  seller: {
    name: string;
    email: string;
    phone: string;
    address: string;
    gstin: string;
    state: string;
    stateCode: string;
  };
  buyer: {
    name: string;
    email?: string;
    phone?: string;
    address: string;
    gstin?: string | null;
    businessName?: string | null;
    state: string;
    stateCode: string;
  };
  orderNumber: string;
  orderDate: string;
  paymentMethod: string;
  paymentStatus: string;
  items: Array<{
    name: string;
    sku: string;
    price: number;
    quantity: number;
    total: number;
    taxableValue: number;
  }>;
  subtotal: number;
  shippingCost: number;
  discount: number;
  taxBreakdown: {
    taxType: "INTRA" | "INTER";
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
  };
  total: number;
  notes?: string;
  terms: string[];
}

export default function InvoicePage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const { isOnline } = useNetworkStatus();

  useEffect(() => {
    const loadInvoice = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/invoice`);
        const data = await res.json();

        if (res.ok && data.invoice) {
          setInvoice(data.invoice);
        } else {
          setError(data.error || "Failed to load invoice");
        }
      } catch {
        setError("Failed to load invoice");
      } finally {
        setLoading(false);
      }
    };

    loadInvoice();
  }, [orderId]);

  const handleDownloadPDF = async () => {
    // Check network connectivity
    if (!isOnline) {
      setError("You're offline. Please check your internet connection to download the PDF.");
      return;
    }
    
    setDownloading(true);
    try {
      const res = await fetch(`/api/orders/${orderId}/invoice/pdf`);
      
      if (!res.ok) {
        throw new Error("Failed to generate PDF");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Invoice-${invoice?.orderNumber || orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      setError("Failed to download PDF");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = window.location.href;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-12 w-12 text-muted-foreground/40 mb-4" />
          <p className="text-base font-semibold">{error || "Invoice not found"}</p>
          <p className="text-sm text-muted-foreground mt-1">
            The invoice you&apos;re looking for could not be loaded.
          </p>
          <Link href="/dashboard/orders" className="mt-4">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/dashboard/orders/${orderId}`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="font-heading text-xl font-bold text-foreground">
              Invoice {invoice.invoiceNumber}
            </h1>
            <p className="text-sm text-muted-foreground">
              Order {invoice.orderNumber} - {new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { dateStyle: "medium" })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:ml-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-2"
          >
            {copied ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy Link
              </>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowInvoiceModal(true)}
            className="gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button
            size="sm"
            onClick={handleDownloadPDF}
            disabled={downloading}
            className="gap-2"
          >
            {downloading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            Download PDF
          </Button>
        </div>
      </div>

      {/* Payment Status Banner */}
      {invoice.paymentStatus === "paid" && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">Payment Confirmed</p>
            <p className="text-sm text-green-700">
              This invoice has been paid via {invoice.paymentMethod ? invoice.paymentMethod.replace("_", " ").toUpperCase() : "Unknown"}
            </p>
          </div>
        </div>
      )}

      {/* Invoice Preview Card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden">
        {/* Invoice Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-2xl font-bold">{invoice.seller.name}</h2>
              <p className="text-sm opacity-90 mt-1">Your Trusted Tech Partner</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold">TAX INVOICE</p>
              <p className="text-sm opacity-90 mt-1">{invoice.invoiceNumber}</p>
            </div>
          </div>
        </div>

        {/* Invoice Details */}
        <div className="p-6 space-y-6">
          {/* Order Info */}
          <div className="flex flex-wrap gap-6 text-sm bg-muted/50 rounded-lg p-4">
            <div>
              <span className="text-muted-foreground">Invoice Date:</span>{" "}
              <span className="font-medium">{new Date(invoice.invoiceDate).toLocaleDateString("en-IN", { dateStyle: "long" })}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Order #:</span>{" "}
              <span className="font-medium">{invoice.orderNumber}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Payment:</span>{" "}
              <span className="font-medium capitalize">{invoice.paymentMethod.replace("_", " ")}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>{" "}
              <span className={`font-medium capitalize ${invoice.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>
                {invoice.paymentStatus}
              </span>
            </div>
          </div>

          {/* Seller & Buyer */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Sold By</p>
              <p className="font-semibold">{invoice.seller.name}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{invoice.seller.address}</p>
              <p className="text-sm text-muted-foreground mt-1">Phone: {invoice.seller.phone}</p>
              <p className="text-sm font-mono text-muted-foreground mt-1">GSTIN: {invoice.seller.gstin}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-4">
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Bill To / Ship To</p>
              <p className="font-semibold">{invoice.buyer.businessName || invoice.buyer.name}</p>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{invoice.buyer.address}</p>
              {invoice.buyer.phone && <p className="text-sm text-muted-foreground mt-1">Phone: {invoice.buyer.phone}</p>}
              {invoice.buyer.gstin && <p className="text-sm font-mono text-muted-foreground mt-1">GSTIN: {invoice.buyer.gstin}</p>}
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-muted-foreground">SKU</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Price</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoice.items.map((item, index) => (
                  <tr key={index}>
                    <td className="px-4 py-3 text-sm">{index + 1}</td>
                    <td className="px-4 py-3 text-sm font-medium">{item.name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-muted-foreground">{item.sku}</td>
                    <td className="px-4 py-3 text-sm text-right">Rs. {(item.price ?? 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-3 text-sm text-center">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right font-medium">Rs. {(item.total ?? 0).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs. {(invoice.subtotal ?? 0).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span>{(invoice.shippingCost ?? 0) === 0 ? "Free" : `Rs. ${(invoice.shippingCost ?? 0).toLocaleString("en-IN")}`}</span>
              </div>
              {(invoice.discount ?? 0) > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-Rs. {(invoice.discount ?? 0).toLocaleString("en-IN")}</span>
                </div>
              )}
              {invoice.taxBreakdown?.taxType === "INTRA" ? (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">CGST (9%)</span>
                    <span>Rs. {(invoice.taxBreakdown?.cgst ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">SGST (9%)</span>
                    <span>Rs. {(invoice.taxBreakdown?.sgst ?? 0).toLocaleString("en-IN")}</span>
                  </div>
                </>
              ) : invoice.taxBreakdown ? (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">IGST (18%)</span>
                  <span>Rs. {(invoice.taxBreakdown?.igst ?? 0).toLocaleString("en-IN")}</span>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-bold border-t border-border pt-2 mt-2">
                <span>Total</span>
                <span className="text-primary">Rs. {(invoice.total ?? 0).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="border-t border-border pt-4">
            <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Terms & Conditions</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {invoice.terms.map((term, index) => (
                <li key={index}>{index + 1}. {term}</li>
              ))}
            </ul>
          </div>

          {/* Footer Notice */}
          <div className="text-center text-xs text-muted-foreground border-t border-border pt-4">
            This is a computer-generated invoice and does not require a physical signature.
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border border-border p-4">
        <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/dashboard/orders/${orderId}`}>
              <ExternalLink className="h-4 w-4 mr-2" />
              View Order Details
            </Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard/orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All Orders
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              const shared = await shareContent({
                title: `Invoice ${invoice.invoiceNumber}`,
                text: `Invoice for Order ${invoice.orderNumber}`,
                url: window.location.href,
              });
              if (!shared) {
                handleCopyLink();
              }
            }}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Invoice
          </Button>
        </div>
      </div>

      {/* Invoice Modal for Print */}
      {showInvoiceModal && (
        <InvoiceView
          invoice={invoice}
          onClose={() => setShowInvoiceModal(false)}
          orderId={orderId}
        />
      )}
    </div>
  );
}
