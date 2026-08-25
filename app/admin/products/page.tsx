import Link from "next/link";
import Image from "next/image";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import { Plus, Edit, Eye, AlertCircle } from "lucide-react";
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

    // IMPORTANT: never pull the `images` array into this list query.
    // 637 of the ~826 products store their images as base64 data URIs inside
    // the document, so the products collection is ~179MB with individual
    // documents up to 1.6MB. Selecting `images` for a page of 20 rows meant
    // transferring tens of megabytes, which blew past the query timeout and
    // made the whole page fall into the catch block below and render
    // "No products found" even though the data was there.
    //
    // Instead, project only the scalar fields the table renders and derive a
    // lightweight thumbnail reference: pass through real URLs, and for embedded
    // base64 images just record that one exists so the row can load it on
    // demand from the thumbnail endpoint. This keeps the payload at ~6KB.
    const firstImage = { $arrayElemAt: ["$images", 0] };

    const [products, total, categories] = await Promise.all([
      Product.aggregate([
        { $match: query },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDoc",
          },
        },
        {
          $project: {
            name: 1,
            slug: 1,
            sku: 1,
            priceB2C: 1,
            priceB2B: 1,
            stock: 1,
            isActive: 1,
            isFeatured: 1,
            category: {
              $let: {
                vars: { c: { $arrayElemAt: ["$categoryDoc", 0] } },
                in: { name: "$$c.name", slug: "$$c.slug" },
              },
            },
            // A directly usable image URL, when the product uses one.
            thumbnailUrl: {
              $cond: [
                {
                  $regexMatch: {
                    input: { $ifNull: [firstImage, ""] },
                    regex: "^https?://",
                  },
                },
                firstImage,
                null,
              ],
            },
            // Flags an image stored inline as base64 so it can be fetched
            // separately instead of inflating this response.
            hasEmbeddedImage: {
              $regexMatch: {
                input: { $ifNull: [firstImage, ""] },
                regex: "^data:",
              },
            },
          },
        },
      ]),
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
      error: null as string | null,
    };
  } catch (error) {
    console.error("Error fetching products:", error);
    // Distinguish "the database call failed" from "there are genuinely no
    // products". Returning a bare empty list for both made a connection
    // failure look like an empty catalog ("No products found"), which hid the
    // real cause. The message is surfaced in the UI so the failure is visible.
    return {
      products: [],
      total: 0,
      page: 1,
      totalPages: 1,
      categories: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown error while loading products",
    };
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const { products, total, page, totalPages, categories, error } = await getProducts(params);

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

      {/* Surface data-layer failures instead of silently rendering an empty
          table, which is indistinguishable from an empty catalog. */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
        >
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-destructive">
              Could not load products
            </p>
            <p className="body-sm mt-1 text-destructive/90">{error}</p>
          </div>
        </div>
      )}

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
                  thumbnailUrl?: string | null;
                  hasEmbeddedImage?: boolean;
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
                          {product.thumbnailUrl || product.hasEmbeddedImage ? (
                            <Image
                              // Use the URL when there is one; otherwise load
                              // the base64 image through the thumbnail route so
                              // it stays out of this page's payload.
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
                          <Plus className="h-4 w-4" />
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
