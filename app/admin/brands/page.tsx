import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Brand from "@/models/Brand";
import Product from "@/models/Product";
import { Plus, Edit, Tag, Package, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DeleteBrandButton from "@/components/admin/DeleteBrandButton";
import BrandsFilters from "@/components/admin/BrandsFilters";

// Force dynamic rendering for admin pages to always show fresh data
export const dynamic = "force-dynamic";

interface BrandsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getBrands(searchParams: { [key: string]: string | string[] | undefined }) {
  try {
    await dbConnect();

    const page = Number(searchParams.page) || 1;
    const limit = 50;
    const skip = (page - 1) * limit;

    const query: Record<string, unknown> = {};

    if (searchParams.search) {
      query.$or = [
        { name: { $regex: searchParams.search, $options: "i" } },
        { slug: { $regex: searchParams.search, $options: "i" } },
      ];
    }

    // Use aggregation to get brand product counts in a single query (no N+1)
    const [brands, total, productCounts] = await Promise.all([
      Brand.find(query)
        .select("_id name slug description logo website isActive sortOrder")
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Brand.countDocuments(query),
      Product.aggregate([
        { $match: { brand: { $exists: true, $ne: null } } },
        { $group: { _id: "$brand", count: { $sum: 1 } } },
      ]),
    ]);

    // Create a map for quick lookup
    const countMap = new Map(productCounts.map((p) => [p._id, p.count]));

    const brandsWithCounts = brands.map((brand) => ({
      ...brand,
      productCount: countMap.get(brand.name) || 0,
    }));

    return {
      brands: JSON.parse(JSON.stringify(brandsWithCounts)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching brands:", error);
    return { brands: [], total: 0, page: 1, totalPages: 1 };
  }
}

export default async function BrandsPage({ searchParams }: BrandsPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const { brands, total, page, totalPages } = await getBrands(params);
  const isSuperAdmin = session?.user?.role === "super_admin";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-xl">Brands</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Manage product brands ({total} brands)
          </p>
        </div>
        <Link href="/admin/brands/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Add Brand
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <BrandsFilters />

      {/* Brands Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {brands.length > 0 ? (
          brands.map((brand: {
            _id: string;
            name: string;
            slug: string;
            description?: string;
            logo?: string;
            website?: string;
            productCount: number;
            isActive: boolean;
          }) => (
            <div
              key={brand._id}
              className="group relative overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Logo */}
              <div className="flex h-32 items-center justify-center bg-muted/30 p-4">
                {brand.logo ? (
                  <Image
                    src={brand.logo}
                    alt={brand.name}
                    width={120}
                    height={80}
                    className="max-h-20 w-auto object-contain"
                    unoptimized
                  />
                ) : (
                  <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                    <Tag className="h-8 w-8 text-primary" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-foreground">{brand.name}</h3>
                    <p className="font-mono text-xs text-muted-foreground">{brand.slug}</p>
                  </div>
                  <Badge
                    variant={brand.isActive ? "default" : "secondary"}
                    className={brand.isActive ? "bg-stb-success/10 text-stb-success" : ""}
                  >
                    {brand.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>

                {brand.description && (
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                    {brand.description}
                  </p>
                )}

                <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Package className="h-3.5 w-3.5" />
                    <span>{brand.productCount} products</span>
                  </div>
                  {brand.website && (
                    <a
                      href={brand.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>Website</span>
                    </a>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center justify-end gap-2 border-t border-border pt-3">
                  <Link
                    href={`/admin/brands/${brand._id}/edit`}
                    className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                  >
                    <Edit className="h-4 w-4" />
                  </Link>
                  {isSuperAdmin && (
                    <DeleteBrandButton
                      brandId={brand._id}
                      brandName={brand.name}
                      productCount={brand.productCount}
                    />
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center rounded-xl border border-border bg-card p-12 shadow-sm">
            <Tag className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">No brands found</p>
            <Link href="/admin/brands/new" className="mt-2">
              <Button variant="outline" className="gap-2">
                <Plus className="h-4 w-4" />
                Add your first brand
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
          <p className="body-sm text-muted-foreground">
            Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of{" "}
            {total} brands
          </p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link
                href={`/admin/brands?page=${page - 1}`}
                className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
              >
                Previous
              </Link>
            )}
            {page < totalPages && (
              <Link
                href={`/admin/brands?page=${page + 1}`}
                className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
              >
                Next
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
