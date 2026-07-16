"use client";

import { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface ImportResult {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; sku: string; error: string }[];
}

export default function ProductImportExport() {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [importMode, setImportMode] = useState<"create" | "update" | "upsert">("upsert");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = async (format: "csv" | "json") => {
    setExporting(true);
    try {
      const res = await fetch(`/api/admin/products/export?format=${format}`);
      
      if (!res.ok) {
        throw new Error("Export failed");
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products-export-${new Date().toISOString().split("T")[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Export error:", error);
      alert("Failed to export products");
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      let products = [];

      if (file.name.endsWith(".json")) {
        // Parse JSON
        const text = await file.text();
        const data = JSON.parse(text);
        products = data.products || data;
      } else if (file.name.endsWith(".csv")) {
        // Parse CSV
        const text = await file.text();
        const lines = text.split("\n").filter(Boolean);
        const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
        
        products = lines.slice(1).map((line) => {
          // Handle quoted values with commas
          const values: string[] = [];
          let current = "";
          let inQuotes = false;
          
          for (const char of line) {
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === "," && !inQuotes) {
              values.push(current.trim());
              current = "";
            } else {
              current += char;
            }
          }
          values.push(current.trim());

          const product: Record<string, string | number | boolean> = {};
          headers.forEach((header, idx) => {
            let value = values[idx]?.replace(/^"|"$/g, "") || "";
            
            // Convert boolean strings
            if (value.toLowerCase() === "true") {
              product[header] = true;
            } else if (value.toLowerCase() === "false") {
              product[header] = false;
            } else if (!isNaN(Number(value)) && value !== "") {
              product[header] = Number(value);
            } else {
              product[header] = value;
            }
          });
          
          return product;
        });
      } else {
        throw new Error("Unsupported file format. Please use CSV or JSON.");
      }

      // Send to API
      const res = await fetch("/api/admin/products/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ products, mode: importMode }),
      });

      const data = await res.json();

      if (res.ok) {
        setImportResult(data.results);
      } else {
        setImportError(data.error || "Import failed");
      }
    } catch (error) {
      console.error("Import error:", error);
      setImportError(error instanceof Error ? error.message : "Failed to import products");
    } finally {
      setImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Export Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2" disabled={exporting}>
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export
              <ChevronDown className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleExport("csv")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("json")}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Import Button */}
        <Button
          variant="outline"
          className="gap-2"
          onClick={() => setShowImportDialog(true)}
        >
          <Upload className="h-4 w-4" />
          Import
        </Button>
      </div>

      {/* Import Dialog */}
      <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Import Products</DialogTitle>
            <DialogDescription>
              Upload a CSV or JSON file to import products in bulk.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Import Mode Selection */}
            <div>
              <label className="text-sm font-medium">Import Mode</label>
              <select
                value={importMode}
                onChange={(e) => setImportMode(e.target.value as typeof importMode)}
                className="mt-1 w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="create">Create Only - Skip existing products</option>
                <option value="update">Update Only - Only update existing products</option>
                <option value="upsert">Upsert - Create new & update existing</option>
              </select>
            </div>

            {/* File Upload */}
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file"
              />
              <label
                htmlFor="import-file"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-10 w-10 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Click to upload or drag and drop
                </span>
                <span className="text-xs text-muted-foreground">
                  CSV or JSON files supported
                </span>
              </label>
            </div>

            {/* Import Progress/Status */}
            {importing && (
              <div className="flex items-center justify-center gap-2 py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm">Importing products...</span>
              </div>
            )}

            {/* Import Error */}
            {importError && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-4 flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-destructive">Import Failed</p>
                  <p className="text-sm text-destructive/80">{importError}</p>
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResult && (
              <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <p className="font-medium">Import Completed</p>
                </div>
                
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
                    <p className="text-2xl font-bold text-green-600">{importResult.created}</p>
                    <p className="text-xs text-muted-foreground">Created</p>
                  </div>
                  <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
                    <p className="text-2xl font-bold text-blue-600">{importResult.updated}</p>
                    <p className="text-xs text-muted-foreground">Updated</p>
                  </div>
                  <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                    <p className="text-2xl font-bold text-yellow-600">{importResult.skipped}</p>
                    <p className="text-xs text-muted-foreground">Skipped</p>
                  </div>
                </div>

                {importResult.errors.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-destructive mb-2">
                      Errors ({importResult.errors.length}):
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1 text-xs">
                      {importResult.errors.slice(0, 10).map((err, idx) => (
                        <p key={idx} className="text-destructive/80">
                          Row {err.row} (SKU: {err.sku}): {err.error}
                        </p>
                      ))}
                      {importResult.errors.length > 10 && (
                        <p className="text-muted-foreground">
                          ...and {importResult.errors.length - 10} more errors
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Sample Format */}
            <div className="rounded-lg bg-muted/50 p-4">
              <p className="text-sm font-medium mb-2">Required CSV/JSON Fields:</p>
              <p className="text-xs text-muted-foreground">
                name, sku, category, priceB2C, priceB2B, mrp, stock
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Optional: slug, description, brand, unit, tags, images, isActive, isFeatured
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowImportDialog(false);
                setImportResult(null);
                setImportError("");
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
