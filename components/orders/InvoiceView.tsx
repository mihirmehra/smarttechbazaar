"use client";

import { useRef, useState } from "react";
import { Printer, Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InvoiceItem {
  name: string;
  sku: string;
  price: number;
  quantity: number;
  total: number;
  taxableValue: number;
}

interface TaxBreakdown {
  taxType: "INTRA" | "INTER";
  cgst: number;
  sgst: number;
  igst: number;
  totalTax: number;
}

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
  items: InvoiceItem[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  taxBreakdown: TaxBreakdown;
  total: number;
  notes?: string;
  terms: string[];
}

interface InvoiceViewProps {
  invoice: InvoiceData;
  onClose?: () => void;
  orderId?: string;
}

export default function InvoiceView({ invoice, onClose, orderId }: InvoiceViewProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  // Extract orderId from invoice if not passed directly
  const invoiceOrderId = orderId || invoice.orderNumber?.replace("INV-", "").replace("STB", "");

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoice.invoiceNumber}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 12px; color: #1a1a1a; padding: 20px; }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #e5e5e5; }
            .logo { font-size: 24px; font-weight: bold; color: #dc2626; }
            .logo-sub { font-size: 10px; color: #737373; }
            .invoice-title { text-align: right; }
            .invoice-title h1 { font-size: 28px; color: #dc2626; margin-bottom: 5px; }
            .invoice-title p { color: #737373; }
            .parties { display: flex; gap: 40px; margin-bottom: 20px; }
            .party { flex: 1; }
            .party-title { font-weight: 600; font-size: 11px; text-transform: uppercase; color: #737373; margin-bottom: 8px; }
            .party-name { font-weight: 600; font-size: 14px; margin-bottom: 4px; }
            .party-detail { color: #525252; line-height: 1.5; }
            .gstin { font-family: monospace; font-size: 11px; color: #525252; margin-top: 4px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
            th { background: #f5f5f5; padding: 10px 8px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; color: #525252; border-bottom: 1px solid #e5e5e5; }
            td { padding: 10px 8px; border-bottom: 1px solid #f5f5f5; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .totals { margin-left: auto; width: 280px; }
            .totals-row { display: flex; justify-content: space-between; padding: 6px 0; }
            .totals-row.total { border-top: 2px solid #1a1a1a; margin-top: 8px; padding-top: 8px; font-weight: bold; font-size: 14px; }
            .footer { margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e5e5; }
            .terms { font-size: 10px; color: #737373; }
            .terms li { margin-bottom: 3px; }
            .signature { text-align: right; margin-top: 40px; }
            .signature-line { border-top: 1px solid #1a1a1a; width: 150px; margin-left: auto; padding-top: 5px; font-size: 11px; }
            @media print {
              body { padding: 0; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleDownloadPDF = async () => {
    if (!orderId) {
      // Fallback to print if no orderId
      handlePrint();
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
      a.download = `Invoice-${invoice.orderNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download PDF:", error);
      // Fallback to print
      handlePrint();
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-2xl">
        {/* Actions Bar */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-gray-50 px-6 py-3">
          <h2 className="text-lg font-semibold text-gray-900">Invoice Preview</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            {orderId && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleDownloadPDF}
                disabled={downloading}
              >
                {downloading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                Download PDF
              </Button>
            )}
            {onClose && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                Close
              </Button>
            )}
          </div>
        </div>

        {/* Invoice Content */}
        <div ref={printRef} className="invoice p-8">
          {/* Header */}
          <div className="header flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-200">
            <div>
              <div className="logo text-2xl font-bold text-red-600">Sabka Tech Bazar</div>
              <div className="logo-sub text-xs text-gray-500">Your Trusted Tech Partner</div>
            </div>
            <div className="invoice-title text-right">
              <h1 className="text-3xl font-bold text-red-600 mb-1">TAX INVOICE</h1>
              <p className="text-gray-500">
                {invoice.invoiceNumber}
                <br />
                Date: {formatDate(invoice.invoiceDate)}
              </p>
            </div>
          </div>

          {/* Parties */}
          <div className="parties flex gap-10 mb-6">
            <div className="party flex-1">
              <div className="party-title text-xs font-semibold uppercase text-gray-500 mb-2">Sold By</div>
              <div className="party-name text-sm font-semibold mb-1">{invoice.seller.name}</div>
              <div className="party-detail text-xs text-gray-600 leading-relaxed">
                {invoice.seller.address}
                <br />
                Phone: {invoice.seller.phone}
                <br />
                Email: {invoice.seller.email}
              </div>
              <div className="gstin font-mono text-xs text-gray-500 mt-1">
                GSTIN: {invoice.seller.gstin}
                <br />
                State: {invoice.seller.state} ({invoice.seller.stateCode})
              </div>
            </div>
            <div className="party flex-1">
              <div className="party-title text-xs font-semibold uppercase text-gray-500 mb-2">Bill To / Ship To</div>
              <div className="party-name text-sm font-semibold mb-1">
                {invoice.buyer.businessName || invoice.buyer.name}
              </div>
              <div className="party-detail text-xs text-gray-600 leading-relaxed">
                {invoice.buyer.address}
                {invoice.buyer.phone && (
                  <>
                    <br />
                    Phone: {invoice.buyer.phone}
                  </>
                )}
                {invoice.buyer.email && (
                  <>
                    <br />
                    Email: {invoice.buyer.email}
                  </>
                )}
              </div>
              {invoice.buyer.gstin && (
                <div className="gstin font-mono text-xs text-gray-500 mt-1">
                  GSTIN: {invoice.buyer.gstin}
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                State: {invoice.buyer.state} ({invoice.buyer.stateCode})
              </div>
            </div>
          </div>

          {/* Order Info */}
          <div className="mb-4 rounded-lg bg-gray-50 p-3">
            <div className="flex gap-6 text-xs">
              <div>
                <span className="text-gray-500">Order #:</span>{" "}
                <span className="font-medium">{invoice.orderNumber}</span>
              </div>
              <div>
                <span className="text-gray-500">Order Date:</span>{" "}
                <span className="font-medium">{formatDate(invoice.orderDate)}</span>
              </div>
              <div>
                <span className="text-gray-500">Payment:</span>{" "}
                <span className="font-medium capitalize">{invoice.paymentMethod ? invoice.paymentMethod.replace("_", " ") : "Unknown"}</span>
              </div>
              <div>
                <span className="text-gray-500">Status:</span>{" "}
                <span className={`font-medium capitalize ${invoice.paymentStatus === "paid" ? "text-green-600" : "text-yellow-600"}`}>
                  {invoice.paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <table className="w-full border-collapse mb-6">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 text-left text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">#</th>
                <th className="p-2 text-left text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">Description</th>
                <th className="p-2 text-left text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">SKU</th>
                <th className="p-2 text-right text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">Price</th>
                <th className="p-2 text-center text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">Qty</th>
                <th className="p-2 text-right text-xs font-semibold uppercase text-gray-600 border-b border-gray-200">Amount</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, index) => (
                <tr key={index} className="border-b border-gray-100">
                  <td className="p-2 text-xs">{index + 1}</td>
                  <td className="p-2 text-xs font-medium">{item.name}</td>
                  <td className="p-2 text-xs font-mono text-gray-500">{item.sku}</td>
                  <td className="p-2 text-xs text-right">{formatCurrency(item.price)}</td>
                  <td className="p-2 text-xs text-center">{item.quantity}</td>
                  <td className="p-2 text-xs text-right font-medium">{formatCurrency(item.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals ml-auto w-72">
            <div className="totals-row flex justify-between py-1 text-sm">
              <span className="text-gray-600">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="totals-row flex justify-between py-1 text-sm">
              <span className="text-gray-600">Shipping</span>
              <span>{invoice.shippingCost === 0 ? "Free" : formatCurrency(invoice.shippingCost)}</span>
            </div>
            {invoice.discount > 0 && (
              <div className="totals-row flex justify-between py-1 text-sm text-green-600">
                <span>Discount</span>
                <span>-{formatCurrency(invoice.discount)}</span>
              </div>
            )}
            {invoice.taxBreakdown.taxType === "INTRA" ? (
              <>
                <div className="totals-row flex justify-between py-1 text-sm">
                  <span className="text-gray-600">CGST (9%)</span>
                  <span>{formatCurrency(invoice.taxBreakdown.cgst)}</span>
                </div>
                <div className="totals-row flex justify-between py-1 text-sm">
                  <span className="text-gray-600">SGST (9%)</span>
                  <span>{formatCurrency(invoice.taxBreakdown.sgst)}</span>
                </div>
              </>
            ) : (
              <div className="totals-row flex justify-between py-1 text-sm">
                <span className="text-gray-600">IGST (18%)</span>
                <span>{formatCurrency(invoice.taxBreakdown.igst)}</span>
              </div>
            )}
            <div className="totals-row total flex justify-between py-2 text-base font-bold border-t-2 border-gray-900 mt-2">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-xs">
            <span className="text-gray-500">Amount in Words:</span>{" "}
            <span className="font-medium">
              Indian Rupees {numberToWords(invoice.total)} Only
            </span>
          </div>

          {/* Footer */}
          <div className="footer mt-8 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-8">
              <div className="terms">
                <div className="text-xs font-semibold uppercase text-gray-500 mb-2">Terms & Conditions</div>
                <ul className="text-xs text-gray-500 list-disc pl-4">
                  {invoice.terms.map((term, index) => (
                    <li key={index} className="mb-1">{term}</li>
                  ))}
                </ul>
              </div>
              <div className="signature text-right mt-8">
                <div className="signature-line border-t border-gray-900 w-40 ml-auto pt-1 text-xs">
                  Authorized Signatory
                </div>
              </div>
            </div>
          </div>

          {/* Computer Generated Notice */}
          <div className="mt-6 text-center text-xs text-gray-400">
            This is a computer-generated invoice and does not require a physical signature.
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to convert number to words (Indian format)
function numberToWords(num: number): string {
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const numToWords = (n: number): string => {
    if (n < 20) return ones[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");
    if (n < 1000) return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 ? " " + numToWords(n % 100) : "");
    if (n < 100000) return numToWords(Math.floor(n / 1000)) + " Thousand" + (n % 1000 ? " " + numToWords(n % 1000) : "");
    if (n < 10000000) return numToWords(Math.floor(n / 100000)) + " Lakh" + (n % 100000 ? " " + numToWords(n % 100000) : "");
    return numToWords(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 ? " " + numToWords(n % 10000000) : "");
  };

  const rupees = Math.floor(num);
  const paise = Math.round((num - rupees) * 100);

  let result = numToWords(rupees);
  if (paise > 0) {
    result += " and " + numToWords(paise) + " Paise";
  }
  return result || "Zero";
}
