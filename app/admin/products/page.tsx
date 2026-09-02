import Link from "next/link";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import { Plus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductImportExport from "@/components/admin/ProductImportExport";
import ProductsFilters from "@/components/admin/ProductsFilters";
import ProductsTable from "@/components/admin/ProductsTable";
import ProductsPageSize from "@/components/admin/ProductsPageSize";
import { cachedQuery } from "@/lib/cache";

// Build a pagination link that preserves the current filters (search, category,
// brand, status, pageSize) and only changes the page number.
function buildPageQuery(
  params: { [key: string]: string | string[] | undefined },
  nextPage: number
) {
  const sp = new URLSearchParams();
  for (const [key, val] of Object.entries(params)) {
    if (key === "page" || val == null) continue;
    sp.set(key, Array.isArray(val) ? val[0] : val);
  }
  sp.set("page", String(nextPage));
  return sp.toString();
}

// Force dynamic rendering for admin pages to always show fresh data
export const dynamic = "force-dynamic";

interface ProductsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getProducts(searchParams: { [key: string]: string | string[] | undefined }) {
 return cachedQuery(
  `admin:products:${JSON.stringify(searchParams)}`,
  () => fetchProducts(searchParams),
  20000
 );
}

async function fetchProducts(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const page = Number(searchParams.page) || 1;

    // Page size — allow 20/30/.../90 or "all". Anything else falls back to 20.
    const ALLOWED_PAGE_SIZES = [20, 30, 40, 50, 60, 70, 80, 90];
    const rawPageSize = String(searchParams.pageSize ?? "");
    const showAll = rawPageSize === "all";
    const limit = showAll
      ? 0
      : ALLOWED_PAGE_SIZES.includes(Number(rawPageSize))
        ? Number(rawPageSize)
        : 20;
    const skip = showAll ? 0 : (page - 1) * limit;

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
        { brand: { $regex: searchParams.search, $options: "i" } },
      ];
    }

    // Brand filter — products store the brand as a name string, so match the
    // selected brand name case-insensitively.
    if (searchParams.brand) {
      const brandValue = String(searchParams.brand);
      const escaped = brandValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.brand = { $regex: new RegExp(`^${escaped}$`, "i") };
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
            { brand: { $regex: searchParams.search, $options: "i" } },
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

    const [products, total, categories, brands] = await Promise.all([
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
      // Brands for the filter dropdown - lightweight name/slug only.
      Brand.find({ isActive: { $ne: false } }).select("_id name slug").sort({ name: 1 }).lean(),
    ]);

    return {
      products: JSON.parse(JSON.stringify(products)),
      total,
      page,
      pageSize: showAll ? total || 1 : limit,
      showAll,
      totalPages: showAll ? 1 : Math.ceil(total / limit),
      categories: JSON.parse(JSON.stringify(categories)),
      brands: JSON.parse(JSON.stringify(brands)),
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
      pageSize: 20,
      showAll: false,
      totalPages: 1,
      categories: [],
      brands: [],
      error:
        error instanceof Error
          ? error.message
          : "Unknown error while loading products",
    };
  }
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const params = await searchParams;
  const { products, total, page, pageSize, showAll, totalPages, categories, brands, error } =
    await getProducts(params);

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
        brands={brands}
        currentCategory={params.category as string | undefined}
        currentBrand={params.brand as string | undefined}
        currentFilter={params.filter as string | undefined}
      />

      {/* Page-size selector + results summary */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <p className="body-sm text-muted-foreground">
          {showAll
            ? `Showing all ${total} products`
            : `Showing ${total === 0 ? 0 : (page - 1) * pageSize + 1} to ${Math.min(
                page * pageSize,
                total
              )} of ${total} products`}
        </p>
        <ProductsPageSize currentPageSize={params.pageSize as string | undefined} />
      </div>

      {/* Products Table with bulk selection + bulk price updater */}
      <ProductsTable products={products} error={error} />

      {/* Pagination — hidden when showing all products */}
      {!showAll && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          {page > 1 && (
            <Link
              href={`/admin/products?${buildPageQuery(params, page - 1)}`}
              className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/products?${buildPageQuery(params, page + 1)}`}
              className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
            >
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
