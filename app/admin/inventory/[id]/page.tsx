import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Plus, Minus, RefreshCw, Package } from "lucide-react";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import InventoryLog from "@/models/InventoryLog";
import { Badge } from "@/components/ui/badge";
import StockAdjustButton from "@/components/admin/StockAdjustButton";

// Force dynamic rendering to always show fresh data after stock updates
export const dynamic = "force-dynamic";

interface ProductInventoryPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getProductInventory(id: string, searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const page = Number(searchParams.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const [product, logs, total] = await Promise.all([
      Product.findById(id).select("name sku stock images priceB2C category").populate("category", "name").lean(),
      InventoryLog.find({ product: id }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      InventoryLog.countDocuments({ product: id }),
    ]);

    if (!product) return null;

    return {
      product: JSON.parse(JSON.stringify(product)),
      logs: JSON.parse(JSON.stringify(logs)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching product inventory:", error);
    return null;
  }
}

const actionTypeConfig: Record<string, { label: string; color: string; icon: typeof Plus }> = {
  purchase: { label: "Purchase", color: "bg-stb-success/10 text-stb-success", icon: Plus },
  sale: { label: "Sale", color: "bg-primary/10 text-primary", icon: Minus },
  adjustment: { label: "Adjustment", color: "bg-accent/10 text-accent", icon: RefreshCw },
  return: { label: "Return", color: "bg-stb-warning/10 text-stb-warning", icon: Plus },
  damage: { label: "Damage", color: "bg-destructive/10 text-destructive", icon: Minus },
  transfer: { label: "Transfer", color: "bg-chart-4/10 text-chart-4", icon: RefreshCw },
  initial: { label: "Initial", color: "bg-muted text-muted-foreground", icon: Package },
};

export default async function ProductInventoryPage({ params, searchParams }: ProductInventoryPageProps) {
  const { id } = await params;
  const sParams = await searchParams;
  const data = await getProductInventory(id, sParams);

  if (!data) {
    notFound();
  }

  const { product, logs, total, page, totalPages } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/inventory"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="heading-xl">Product Inventory</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Stock history for {product.name}
          </p>
        </div>
      </div>

      {/* Product Info Card */}
      <div className="flex flex-wrap items-center gap-6 rounded-xl border border-border bg-card p-6 shadow-sm">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {product.images?.[0] ? (
            <Image
              src={product.images[0]}
              alt={product.name}
              width={80}
              height={80}
              className="h-full w-full object-cover"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <Package className="h-8 w-8 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="flex-1">
          <h2 className="text-xl font-semibold">{product.name}</h2>
          <p className="text-sm text-muted-foreground">SKU: {product.sku}</p>
          {product.category && (
            <p className="text-sm text-muted-foreground">Category: {product.category.name}</p>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold">{product.stock}</p>
            <p className="text-sm text-muted-foreground">Current Stock</p>
          </div>

          <div className="text-center">
            <p className="text-xl font-semibold">₹{(product.stock * product.priceB2C).toLocaleString("en-IN")}</p>
            <p className="text-sm text-muted-foreground">Stock Value</p>
          </div>

          <StockAdjustButton
            productId={product._id}
            productName={product.name}
            currentStock={product.stock}
          />
        </div>
      </div>

      {/* Stock History */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-6 py-4">
          <h2 className="heading-md">Stock History ({total} entries)</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Date & Time
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Type
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Change
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Stock After
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Reason
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  By
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {logs.length > 0 ? (
                logs.map((log: {
                  _id: string;
                  actionType: string;
                  quantityChange: number;
                  previousStock: number;
                  newStock: number;
                  reason?: string;
                  performedByName: string;
                  createdAt: string;
                }) => {
                  const config = actionTypeConfig[log.actionType] || actionTypeConfig.adjustment;
                  const Icon = config.icon;

                  return (
                    <tr key={log._id} className="hover:bg-muted/30">
                      <td className="px-4 py-3 text-sm">
                        <div className="text-foreground">
                          {new Date(log.createdAt).toLocaleDateString("en-IN")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleTimeString("en-IN")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="secondary" className={config.color}>
                          <Icon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`font-bold ${
                            log.quantityChange > 0
                              ? "text-stb-success"
                              : log.quantityChange < 0
                                ? "text-destructive"
                                : "text-muted-foreground"
                          }`}
                        >
                          {log.quantityChange > 0 ? "+" : ""}
                          {log.quantityChange}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-medium">{log.newStock}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground max-w-[250px]">
                        <p className="line-clamp-2">{log.reason || "-"}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {log.performedByName}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">
                    No stock history yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="body-sm text-muted-foreground">
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of {total} entries
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/inventory/${product._id}?page=${page - 1}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/inventory/${product._id}?page=${page + 1}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Next
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
