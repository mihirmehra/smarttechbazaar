import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { Plus, Edit, FolderTree, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DeleteCategoryButton from "@/components/admin/DeleteCategoryButton";
import SeedCategoriesButton from "@/components/admin/SeedCategoriesButton";
import CategoriesFilters from "@/components/admin/CategoriesFilters";

// Force dynamic rendering for admin pages to always show fresh data
export const dynamic = "force-dynamic";

interface CategoriesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getCategories(searchParams: { [key: string]: string | string[] | undefined }) {
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

    if (searchParams.parent === "root") {
      query.parent = null;
    }

    // Use aggregation to get all counts in parallel - eliminates N+1 queries
    const [categories, total, productCounts, subcategoryCounts] = await Promise.all([
      Category.find(query)
        .select("_id name slug description image icon parent isActive sortOrder")
        .populate("parent", "name slug")
        .sort({ sortOrder: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Category.countDocuments(query),
      // Get all product counts in a single aggregation
      Product.aggregate([
        { $match: { category: { $exists: true, $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      // Get all subcategory counts in a single aggregation
      Category.aggregate([
        { $match: { parent: { $exists: true, $ne: null } } },
        { $group: { _id: "$parent", count: { $sum: 1 } } },
      ]),
    ]);

    // Create maps for O(1) lookups
    const productCountMap = new Map(
      productCounts.map((p) => [p._id.toString(), p.count])
    );
    const subcategoryCountMap = new Map(
      subcategoryCounts.map((s) => [s._id.toString(), s.count])
    );

    // Map counts to categories
    const categoriesWithCounts = categories.map((cat) => ({
      ...cat,
      productCount: productCountMap.get(cat._id.toString()) || 0,
      subcategoryCount: subcategoryCountMap.get(cat._id.toString()) || 0,
    }));

    return {
      categories: JSON.parse(JSON.stringify(categoriesWithCounts)),
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  } catch (error) {
    console.error("Error fetching categories:", error);
    return { categories: [], total: 0, page: 1, totalPages: 1 };
  }
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;
  const { categories, total, page, totalPages } = await getCategories(params);
  const isSuperAdmin = session?.user?.role === "super_admin";

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-xl">Categories</h1>
          <p className="body-md mt-1 text-muted-foreground">
            Manage product categories ({total} categories)
          </p>
        </div>
        <div className="flex gap-3">
          {isSuperAdmin && categories.length === 0 && (
            <SeedCategoriesButton />
          )}
          <Link href="/admin/categories/new">
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add Category
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <CategoriesFilters currentParent={params.parent as string | undefined} />

      {/* Categories Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-border bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Slug
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                  Parent
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Products
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Subcategories
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium uppercase text-muted-foreground">
                  Order
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
              {categories.length > 0 ? (
                categories.map((category: {
                  _id: string;
                  name: string;
                  slug: string;
                  description?: string;
                  image?: string;
                  icon?: string;
                  parent?: { _id: string; name: string; slug: string };
                  productCount: number;
                  subcategoryCount: number;
                  sortOrder: number;
                  isActive: boolean;
                }) => (
                  <tr key={category._id} className="hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                          {category.image ? (
                            <Image
                              src={category.image}
                              alt={category.name}
                              width={40}
                              height={40}
                              className="h-full w-full object-cover"
                              unoptimized
                            />
                          ) : (
                            <FolderTree className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {category.name}
                          </p>
                          {category.description && (
                            <p className="body-sm line-clamp-1 text-muted-foreground">
                              {category.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm text-muted-foreground">
                      {category.slug}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {category.parent ? (
                        <Link
                          href={`/admin/categories/${category.parent._id}/edit`}
                          className="text-primary hover:underline"
                        >
                          {category.parent.name}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Package className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{category.productCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <FolderTree className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm font-medium">{category.subcategoryCount}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-muted-foreground">
                        {category.sortOrder}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge
                        variant={category.isActive ? "default" : "secondary"}
                        className={
                          category.isActive
                            ? "bg-stb-success/10 text-stb-success"
                            : ""
                        }
                      >
                        {category.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/categories/${category._id}/edit`}
                          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        {isSuperAdmin && (
                          <DeleteCategoryButton
                            categoryId={category._id}
                            categoryName={category.name}
                            productCount={category.productCount}
                            subcategoryCount={category.subcategoryCount}
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <FolderTree className="h-12 w-12 text-muted-foreground" />
                      <p className="text-muted-foreground">No categories found</p>
                      {isSuperAdmin && (
                        <SeedCategoriesButton />
                      )}
                    </div>
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
              Showing {(page - 1) * 50 + 1} to {Math.min(page * 50, total)} of{" "}
              {total} categories
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <Link
                  href={`/admin/categories?page=${page - 1}`}
                  className="rounded-md border border-border px-3 py-1 text-sm hover:bg-muted"
                >
                  Previous
                </Link>
              )}
              {page < totalPages && (
                <Link
                  href={`/admin/categories?page=${page + 1}`}
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
