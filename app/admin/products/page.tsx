import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { Plus, Edit, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DeleteProductButton from "@/components/admin/DeleteProductButton";
import ProductImportExport from "@/components/admin/ProductImportExport";
import ProductsFilters from "@/components/admin/ProductsFilters";
import { formatPrice } from "@/lib/pricing";

// Force dynamic rendering for admin pages to always show fresh data
export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getProducts(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const page = Number(searchParams.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    // Optimize category lookup - only fetch category ID if needed
    if (searchParams.category) {
      const category = await Category.findOne({ slug: searchParams.category }).select("_id").lean();
      if (category) {
        query.category = category._id;
      }
    }

    if (searchParams.search) {
      query.$or = [
        { name: { $regex: searchParams.search, $options: "i" } },
        { sku: { $regex: searchParams.search, $options: "i" } },
      ];
    }

    // Improved stock filtering
    if (searchParams.filter === "low-stock") {
      query.stock = { $gt: 0, $lt: 10 };
    } else if (searchParams.filter === "out-of-stock") {
      query.$or = query.$or ? undefined : [{ stock: 0 }, { stock: { $exists: false } }, { stock: null }];
      if (searchParams.search) {
        query.$and = [
          { $or: [
            { name: { $regex: searchParams.search, $options: "i" } },
            { sku: { $regex: searchParams.search, $options: "i" } },
          ]},
          { $or: [{ stock: 0 }, { stock: { $exists: false } }, { stock: null }] }
        ];
        delete query.$or;
      }
    } else if (searchParams.filter === "featured") {
      query.isFeatured = true;
    }

    const [products, total, categories] = await Promise.all([
      Product.find(query)
        // Select only necessary fields for list view - significant performance gain
        .select("_id name slug images priceB2C priceB2B stock sku isActive isFeatured category")
        .populate("category", "name slug")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(query),
      // Cache categories - they don't change often
      Category.find({ isActive: true }).select("_id name slug").sort({ name: 1 }).lean(),
    ]);

    return {
      products: JSON.parse(JSON.stringify(products)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      categories: JSON.parse(JSON.stringify(categories)),
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    return { products: [], total: 0, page: 1, totalPages: 1, categories: [] };
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const { products, total, page, totalPages, categories } = await getProducts(params);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-xl">Products</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Manage your product catalog ({total} products)
          </p>
        </div>
        <div className="flex items-center gap-3">
          <ProductImportExport />
          <Link href="/admin/products/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <ProductsFilters
        categories={categories}
        currentCategory={params.category as string | undefined}
        currentFilter={params.filter as string | undefined}
      />

      {/* Products Table */}
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
              {products.length > 0 ? (
                products.map((product: {
                  _id: string;
                  name: string;
                  slug: string;
                  sku: string;
                  images?: string[];
                  category?: { name: string; slug: string };
                  priceB2C: number;
                  priceB2B: number;
                  stock: number;
                  isActive: boolean;
                  isFeatured: boolean;
                }) => (
                  <tr key={product._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-muted">
                          {product.images?.[0] ? (
                            <Image
                              src={product.images[0]}
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
                          product.isActive
                            ? "bg-stb-success/10 text-stb-success"
                            : ""
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
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <p className="text-muted-foreground">No products found</p>
                    <Link
                      href="/admin/products/new"
                      className="mt-2 inline-flex items-center gap-2 text-primary hover:underline"
                    >
                      <Plus className="h-4 w-4" />
                      Add your first product
                    </Link>
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
              Showing {(page - 1) * 20 + 1} to {Math.min(page * 20, total)} of{" "}
              {total} products
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/products?page=${page - 1}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/products?page=${page + 1}`}
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
