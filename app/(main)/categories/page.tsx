import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";
import { generateWebPageSchema, generateOrganizationSchema } from "@/lib/schema";
import { ChevronRight } from "lucide-react";

// Enable ISR with 5 minute revalidation
export const revalidate = 300;

export const metadata: Metadata = {
  title: "All Categories",
  description: `Browse all product categories at ${siteConfig.name}. Find desktops, laptops, networking equipment, security systems, and more.`,
  alternates: {
    canonical: getCanonicalUrl("/categories"),
  },
  openGraph: {
    title: `All Categories | ${siteConfig.name}`,
    description: `Browse all product categories at ${siteConfig.name}. Find the perfect tech products for your needs.`,
    url: getCanonicalUrl("/categories"),
  },
};

interface CategoryWithCount {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount: number;
  subcategories?: {
    _id: string;
    name: string;
    slug: string;
    productCount: number;
  }[];
}

// Default categories for fallback
const defaultCategories: CategoryWithCount[] = [
  { _id: "desktop", name: "Desktop", slug: "desktop", image: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "laptops", name: "Laptops", slug: "laptops", image: "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "storage", name: "Storage", slug: "storage", image: "https://images.unsplash.com/photo-1653179767378-98bb414f9bfd?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "display", name: "Display", slug: "display", image: "https://images.unsplash.com/photo-1572476359541-2a41ec8405e5?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "peripherals", name: "Peripherals", slug: "peripherals", image: "https://images.unsplash.com/photo-1662758392656-0e5d4b0f53fb?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "printers-scanners", name: "Printers & Scanners", slug: "printers-scanners", image: "https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "security", name: "Security", slug: "security", image: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "networking", name: "Networking", slug: "networking", image: "https://images.unsplash.com/photo-1544985562-128e7b377a21?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "software", name: "Software", slug: "software", image: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "mobility", name: "Mobility", slug: "mobility", image: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "cables", name: "Cables", slug: "cables", image: "https://images.unsplash.com/photo-1601524909162-ae8725290836?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "connectors-converters", name: "Connectors & Converters", slug: "connectors-converters", image: "https://images.unsplash.com/photo-1625895197185-efcec01cffe0?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "accessories", name: "Accessories", slug: "accessories", image: "https://images.unsplash.com/photo-1614624532983-4ce03382d63d?w=200&h=200&fit=crop", productCount: 0 },
  { _id: "refurbished-laptops", name: "Refurbished Laptops", slug: "refurbished-laptops", image: "https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=200&h=200&fit=crop", productCount: 0 },
];

async function getCategories(): Promise<CategoryWithCount[]> {
  try {
    await dbConnect();

    // Get all parent categories (no parent field or parent is null)
    const [categories, productCounts, allCategories] = await Promise.all([
      Category.find({ isActive: true, parent: { $exists: false } })
        .select("_id name slug description image sortOrder")
        .sort({ sortOrder: 1, name: 1 })
        .lean(),
      Product.aggregate([
        { $match: { isActive: true, category: { $exists: true, $ne: null } } },
        { $group: { _id: "$category", count: { $sum: 1 } } },
      ]),
      Category.find({ isActive: true })
        .select("_id name slug parent")
        .lean(),
    ]);

    if (!categories || categories.length === 0) {
      return defaultCategories;
    }

    // Create a map for quick lookup of product counts by category ID
    const countMap = new Map(productCounts.map((p) => [p._id.toString(), p.count]));

    // Create a map of parent ID to subcategories
    const subcategoryMap = new Map<string, typeof allCategories>();
    for (const cat of allCategories) {
      if (cat.parent) {
        const parentId = cat.parent.toString();
        if (!subcategoryMap.has(parentId)) {
          subcategoryMap.set(parentId, []);
        }
        subcategoryMap.get(parentId)!.push(cat);
      }
    }

    const categoriesWithCounts = categories.map((category) => {
      const catId = category._id.toString();
      const subcats = subcategoryMap.get(catId) || [];
      
      // Calculate total product count (category + all subcategories)
      let totalCount = countMap.get(catId) || 0;
      const subcategoriesWithCounts = subcats.map((sub) => {
        const subCount = countMap.get(sub._id.toString()) || 0;
        totalCount += subCount;
        return {
          _id: sub._id.toString(),
          name: sub.name,
          slug: sub.slug,
          productCount: subCount,
        };
      });

      return {
        _id: catId,
        name: category.name,
        slug: category.slug,
        description: category.description,
        image: category.image,
        productCount: totalCount,
        subcategories: subcategoriesWithCounts.length > 0 ? subcategoriesWithCounts : undefined,
      };
    });

    return categoriesWithCounts.length > 0 ? categoriesWithCounts : defaultCategories;
  } catch {
    return defaultCategories;
  }
}

export default async function CategoriesPage() {
  const categories = await getCategories();

  // Schema markup
  const schemas = [
    generateOrganizationSchema(),
    generateWebPageSchema(
      "All Categories",
      `Browse all product categories at ${siteConfig.name}`,
      "/categories"
    ),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]">
      <Header />
      <main className="flex-1">
        {/* Schema */}
        <JsonLd data={schemas} />

        {/* Breadcrumb */}
        <Breadcrumbs items={[{ label: "Categories" }]} />

        {/* Page Header */}
        <div className="border-b border-border bg-white px-3 py-4 md:px-4 md:py-6">
          <div className="mx-auto max-w-7xl">
            <h1 className="text-lg font-extrabold text-foreground md:text-2xl">
              Shop by Category
            </h1>
            <p className="mt-1 text-xs text-muted-foreground md:text-sm">
              Browse our complete range of technology products
            </p>
            <p className="mt-1.5 text-[10px] font-medium text-muted-foreground md:text-xs">
              {categories.length} categories available
            </p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((category) => (
              <Link
                key={category._id}
                href={`/category/${category.slug}`}
                className="group flex flex-col overflow-hidden rounded-xl border border-border bg-white transition-all hover:border-primary hover:shadow-md"
              >
                {/* Image */}
                <div className="relative aspect-square w-full overflow-hidden bg-muted">
                  {category.image ? (
                    <Image
                      src={category.image}
                      alt={category.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                      unoptimized
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
                      <span className="text-3xl font-bold text-primary/30">
                        {category.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col p-3">
                  <h2 className="text-sm font-semibold text-foreground group-hover:text-primary md:text-base">
                    {category.name}
                  </h2>
                  {category.productCount > 0 && (
                    <p className="mt-0.5 text-[10px] text-muted-foreground md:text-xs">
                      {category.productCount} products
                    </p>
                  )}
                  
                  {/* Subcategories preview */}
                  {category.subcategories && category.subcategories.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {category.subcategories.slice(0, 3).map((sub) => (
                        <span
                          key={sub._id}
                          className="rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground md:text-[10px]"
                        >
                          {sub.name}
                        </span>
                      ))}
                      {category.subcategories.length > 3 && (
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] text-muted-foreground md:text-[10px]">
                          +{category.subcategories.length - 3} more
                        </span>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-2">
                    <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary md:text-xs">
                      Browse <ChevronRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
