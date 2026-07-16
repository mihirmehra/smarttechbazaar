import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { Package, AlertTriangle, TrendingUp, IndianRupee, History } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import StockAdjustButton from "@/components/admin/StockAdjustButton";
import { formatPrice } from "@/lib/pricing";
import InventoryFilters from "@/components/admin/InventoryFilters";

// Force dynamic rendering to always show fresh data after stock updates
export const dynamic = "force-dynamic";

interface InventoryPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getInventory(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const page = Number(searchParams.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;
    const filter = searchParams.filter as string;
    const sort = (searchParams.sort as string) || "stock-asc";

    // Build all conditions as an array and combine with $and at the end.
    // This avoids the bug where setting query.$or twice (once for search,
    // once for out-of-stock filter) silently overwrites the first assignment.
    const conditions: Record<string, unknown>[] = [
      { isActive: { $ne: false } },
    ];

    if (searchParams.search) {
      conditions.push({
        $or: [
          { name: { $regex: searchParams.search, $options: "i" } },
          { sku: { $regex: searchParams.search, $options: "i" } },
        ],
      });
    }

    if (filter === "out-of-stock") {
      // stock === 0 OR stock field missing — covers all "no stock" states
      conditions.push({
        $or: [{ stock: 0 }, { stock: { $exists: false } }, { stock: null }],
      });
    } else if (filter === "low-stock") {
      conditions.push({ stock: { $gt: 0, $lt: 10 } });
    } else if (filter === "in-stock") {
      conditions.push({ stock: { $gte: 10 } });
    }

    // Collapse to a simple object when there is only one condition so
    // MongoDB does not have to evaluate a single-element $and array.
    const query = conditions.length === 1 ? conditions[0] : { $and: conditions };

    let sortOption: Record<string, 1 | -1> = { stock: 1 };
    if (sort === "stock-desc") sortOption = { stock: -1 };
    else if (sort === "name-asc") sortOption = { name: 1 };
    else if (sort === "sku-asc") sortOption = { sku: 1 };

    const [products, total, stats] = await Promise.all([
      Product.find(query)
        .select("_id name sku stock images priceB2C category isActive")
        .populate("category", "name")
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      getInventoryStats(),
    ]);

    return {
      products: JSON.parse(JSON.stringify(products)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      stats,
    };
  } catch (error) {
    console.error("Error fetching inventory:", error);
    return {
      products: [],
      total: 0,
      page: 1,
      totalPages: 1,
      stats: { totalProducts: 0, outOfStock: 0, lowStock: 0, inStock: 0, totalValue: 0 },
    };
  }
}

async function getInventoryStats() {
  // Use aggregation to get all stats in a single query for better performance
  const stats = await Product.aggregate([
    { $match: { isActive: { $ne: false } } },
    {
      $facet: {
        total: [{ $count: "count" }],
        outOfStock: [{ $match: { $or: [{ stock: 0 }, { stock: null }, { stock: { $exists: false } }] } }, { $count: "count" }],
        lowStock: [{ $match: { stock: { $gt: 0, $lt: 10 } } }, { $count: "count" }],
        totalValue: [{ $group: { _id: null, total: { $sum: { $multiply: [{ $ifNull: ["$stock", 0] }, { $ifNull: ["$priceB2C", 0] }] } } } }],
      },
    },
  ]);

  const result = stats[0] || {};
  const totalProducts = result.total?.[0]?.count || 0;
  const outOfStock = result.outOfStock?.[0]?.count || 0;
  const lowStock = result.lowStock?.[0]?.count || 0;

  return {
    totalProducts,
    outOfStock,
    lowStock,
    inStock: totalProducts - outOfStock - lowStock,
    totalValue: result.totalValue?.[0]?.total || 0,
  };
}

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const params = await searchParams;
  const { products, total, page, totalPages, stats } = await getInventory(params);

  const statCards = [
    {
      title: "Total Products",
      value: stats.totalProducts,
      icon: Package,
      color: "bg-primary",
    },
    {
      title: "In Stock",
      value: stats.inStock,
      icon: TrendingUp,
      color: "bg-stb-success",
    },
    {
      title: "Low Stock",
      value: stats.lowStock,
      icon: AlertTriangle,
      color: "bg-stb-warning",
    },
    {
      title: "Out of Stock",
      value: stats.outOfStock,
      icon: Package,
      color: "bg-destructive",
    },
    {
      title: "Inventory Value",
      value: formatPrice(stats.totalValue),
      icon: IndianRupee,
      color: "bg-accent",
      wide: true,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-xl">Inventory Management</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Monitor and manage your product stock levels
          </p>
        </div>
        <Link
          href="/admin/inventory/logs"
          className="flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
        >
          <History className="h-4 w-4" />
          View History
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((stat) => (
          <div
            key={stat.title}
            className={`rounded-xl border border-border bg-card p-4 shadow-sm ${stat.wide ? "sm:col-span-2 lg:col-span-1" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.title}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <InventoryFilters
        currentFilter={params.filter as string | undefined}
        currentSort={params.sort as string | undefined}
      />

      {/* Inventory Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Product
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  SKU
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  <Link
                    href={`/admin/inventory?sort=${params.sort === "stock-asc" ? "stock-desc" : "stock-asc"}${params.filter ? `&filter=${params.filter}` : ""}`}
                    className="hover:text-foreground"
                  >
                    Stock {params.sort === "stock-desc" ? "↓" : "↑"}
                  </Link>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Value
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length > 0 ? (
                products.map((product: {
                  _id: string;
                  name: string;
                  sku: string;
                  stock: number;
                  images?: string[];
                  priceB2C: number;
                  category?: { name: string };
                }) => (
                  <tr key={product._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {product.images?.[0] ? (
                            <Image
                              src={product.images[0]}
                              alt={product.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center">
                              <Package className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <p className="font-medium text-foreground line-clamp-1">
                          {product.name}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                      {product.sku}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {product.category?.name || "-"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block min-w-[3rem] rounded-full px-3 py-1 text-sm font-bold ${
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
                        variant="secondary"
                        className={
                          product.stock === 0
                            ? "bg-destructive/10 text-destructive"
                            : product.stock < 10
                              ? "bg-stb-warning/10 text-stb-warning"
                              : "bg-stb-success/10 text-stb-success"
                        }
                      >
                        {product.stock === 0
                          ? "Out of Stock"
                          : product.stock < 10
                            ? "Low Stock"
                            : "In Stock"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatPrice((product.stock || 0) * (product.priceB2C || 0))}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <StockAdjustButton
                          productId={product._id}
                          productName={product.name}
                          currentStock={product.stock}
                        />
                        <Link
                          href={`/admin/inventory/${product._id}`}
                          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          title="View history"
                        >
                          <History className="h-4 w-4" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No products found
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
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of {total} products
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/inventory?page=${page - 1}${params.filter ? `&filter=${params.filter}` : ""}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/inventory?page=${page + 1}${params.filter ? `&filter=${params.filter}` : ""}`}
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
