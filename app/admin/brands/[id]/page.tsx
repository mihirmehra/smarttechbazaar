import Link from "next/link";
import { notFound } from "next/navigation";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import { ArrowLeft, Plus, AlertCircle, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductsFilters from "@/components/admin/ProductsFilters";
import ProductsTable from "@/components/admin/ProductsTable";
import ProductsPageSize from "@/components/admin/ProductsPageSize";
import { cachedQuery } from "@/lib/cache";

// Force dynamic rendering for admin pages to always show fresh data
export const dynamic = "force-dynamic";

interface BrandProductsPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Build a pagination link that preserves the current filters and only changes
// the page number.
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

async function getBrandProducts(
  brandId: string,
  searchParams: { [key: string]: string | string[] | undefined }
) {
  return cachedQuery(
    `admin:brand-products:${brandId}:${JSON.stringify(searchParams)}`,
    () => fetchBrandProducts(brandId, searchParams),
    20000
  );
}

async function fetchBrandProducts(
  brandId: string,
  searchParams: { [key: string]: string | string[] | undefined }
) {
  await dbConnect();

  const brand = await Brand.findById(brandId).select("_id name slug").lean();
  if (!brand) return { brand: null };

  const brandName = (brand as { name: string }).name;

  const page = Number(searchParams.page) || 1;
  const ALLOWED_PAGE_SIZES = [20, 30, 40, 50, 60, 70, 80, 90];
  const rawPageSize = String(searchParams.pageSize ?? "");
  const showAll = rawPageSize === "all";
  const limit = showAll
    ? 0
    : ALLOWED_PAGE_SIZES.includes(Number(rawPageSize))
      ? Number(rawPageSize)
      : 20;
  const skip = showAll ? 0 : (page - 1) * limit;

  // Scope every query to this brand by name (products store the brand as a
  // name string), matched case-insensitively.
  const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const query: Record<string, unknown> = {
    brand: { $regex: new RegExp(`^${escaped}$`, "i") },
  };

  if (searchParams.category) {
    const category = await Category.findOne({ slug: searchParams.category })
      .select("_id")
      .lean();
    if (category) query.category = category._id;
  }

  if (searchParams.search) {
    query.$or = [
      { name: { $regex: searchParams.search, $options: "i" } },
      { sku: { $regex: searchParams.search, $options: "i" } },
    ];
  }

  if (searchParams.filter === "low-stock") {
    query.stock = { $gt: 0, $lt: 10 };
  } else if (searchParams.filter === "out-of-stock") {
    const stockOr = [
      { stock: 0 },
      { stock: { $exists: false } },
      { stock: null },
    ];
    if (searchParams.search) {
      query.$and = [{ $or: query.$or }, { $or: stockOr }];
      delete query.$or;
    } else {
      query.$or = stockOr;
    }
  } else if (searchParams.filter === "featured") {
    query.isFeatured = true;
  }

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
    Category.find({ isActive: true })
      .select("_id name slug")
      .sort({ name: 1 })
      .lean(),
  ]);

  return {
    brand: JSON.parse(JSON.stringify(brand)),
    products: JSON.parse(JSON.stringify(products)),
    total,
    page,
    pageSize: showAll ? total || 1 : limit,
    showAll,
    totalPages: showAll ? 1 : Math.ceil(total / limit),
    categories: JSON.parse(JSON.stringify(categories)),
  };
}

export default async function BrandProductsPage({
  params,
  searchParams,
}: BrandProductsPageProps) {
  const { id } = await params;
  const sp = await searchParams;

  let data: Awaited<ReturnType<typeof fetchBrandProducts>> | null = null;
  let error: string | null = null;
  try {
    data = await getBrandProducts(id, sp);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load brand products";
  }

  if (data && data.brand === null) {
    notFound();
  }

  const brand = data?.brand as { _id: string; name: string; slug: string } | undefined;
  const products = data?.products ?? [];
  const total = data?.total ?? 0;
  const page = data?.page ?? 1;
  const pageSize = data?.pageSize ?? 20;
  const showAll = data?.showAll ?? false;
  const totalPages = data?.totalPages ?? 1;
  const categories = data?.categories ?? [];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/admin/brands"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card transition-colors hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" />
            <h1 className="heading-xl">{brand?.name ?? "Brand"}</h1>
          </div>
          <p className="body-md mt-1 text-muted-foreground">
            {total} product{total === 1 ? "" : "s"} in this brand
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
      </div>

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

      {/* Filters — brand dropdown omitted since we're already scoped to one brand */}
      <ProductsFilters
        categories={categories}
        brands={[]}
        currentCategory={sp.category as string | undefined}
        currentFilter={sp.filter as string | undefined}
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
        <ProductsPageSize currentPageSize={sp.pageSize as string | undefined} />
      </div>

      {/* Products table with bulk selection + bulk price updater */}
      <ProductsTable products={products} error={error} />

      {/* Pagination */}
      {!showAll && totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          {page > 1 && (
            <Link
              href={`/admin/brands/${id}?${buildPageQuery(sp, page - 1)}`}
              className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
            >
              Previous
            </Link>
          )}
          {page < totalPages && (
            <Link
              href={`/admin/brands/${id}?${buildPageQuery(sp, page + 1)}`}
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
