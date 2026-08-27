import { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CategoryPageClient from "@/components/products/CategoryPageClient";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import dbConnect from "@/lib/mongodb";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Brand from "@/models/Brand";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";
import { generateCollectionPageSchema, generateOrganizationSchema } from "@/lib/schema";

// Incrementally-static: the rendered page is cached and revalidated in the
// background instead of hitting MongoDB on every single request. Admin category
// and product mutations call revalidatePath()/revalidateTag(), so edits appear
// immediately.
export const revalidate = 3600;

// Allow dynamic paths that weren't generated at build time
export const dynamicParams = true;

// Hard ceiling on how many products a single category page will render.
// Without this, a category with thousands of products serialized every one of
// them into the HTML payload.
const CATEGORY_PRODUCT_LIMIT = 300;

// Only the fields ProductCard and the filter sidebar actually read. Previously
// this page sent whole documents — full HTML descriptions, every specification
// row, meta tags — for every product in the category.
// `images` is deliberately absent: those are inline base64 data URIs (~873KB
// each), so selecting them for up to 300 products dominated the render time.
// Each card gets a `/api/media/product/<id>?i=0` URL instead, which the browser
// loads lazily, in parallel, and caches immutably.
const CATEGORY_PRODUCT_FIELDS =
  "_id name slug priceB2C priceB2B mrp stock brand category isFeatured isNewArrival isBestSeller tags";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Wrapped in React `cache()` so generateMetadata() and the page component share
// one result per request. Without it, every category view ran this entire set of
// queries twice.
const getCategoryData = cache(async (slug: string) => {
  try {
    await dbConnect();

    // First check if the slug is for a subcategory
    // `image` omitted: it is an inline base64 data URI, and it was being
    // serialized into the RSC payload, the OG/Twitter meta tags AND the JSON-LD
    // schema — three copies of the same multi-KB blob on every render.
    const categoryDoc = await Category.findOne({ slug, isActive: true })
      .select("_id name slug description parent")
      .lean();
    if (!categoryDoc) return null;

    const category = {
      ...JSON.parse(JSON.stringify(categoryDoc)),
      image: `/api/media/category/${String(categoryDoc._id)}`,
    };
    const categoryId = category._id;
    const isSubcategory = !!category.parent;

    // Resolve the parent (for breadcrumbs) or the subcategory list in one step.
    const [parentDoc, subcategoryDocs] = await Promise.all([
      isSubcategory
        ? Category.findById(category.parent).select("_id name slug").lean()
        : null,
      isSubcategory
        ? []
        : Category.find({ parent: categoryId, isActive: true })
            .select("_id name slug")
            .sort({ sortOrder: 1 })
            .lean(),
    ]);

    const parentCategory = parentDoc ? JSON.parse(JSON.stringify(parentDoc)) : null;
    const subcategories = JSON.parse(JSON.stringify(subcategoryDocs ?? []));

    // A subcategory only shows its own products; a main category also includes
    // everything filed under its children.
    const allCategoryIds: string[] = isSubcategory
      ? [categoryId]
      : [categoryId, ...subcategories.map((s: { _id: string }) => s._id)];

    const productFilter = { category: { $in: allCategoryIds }, isActive: true };

    // Products, total count, and all filter facets in parallel. The facets are
    // computed by MongoDB over the WHOLE category, so the sidebar stays accurate
    // even though the rendered product list is capped.
    const [productDocs, totalProducts, facetResult, subcategoryCounts] = await Promise.all([
      Product.find(productFilter)
        .select(CATEGORY_PRODUCT_FIELDS)
        .populate("category", "name slug")
        .sort({ isFeatured: -1, createdAt: -1 })
        .limit(CATEGORY_PRODUCT_LIMIT)
        .lean(),
      Product.countDocuments(productFilter),
      Product.aggregate([
        { $match: productFilter },
        {
          $facet: {
            brands: [
              { $match: { brand: { $ne: null } } },
              { $group: { _id: "$brand", productCount: { $sum: 1 } } },
            ],
            tags: [{ $unwind: "$tags" }, { $group: { _id: "$tags" } }],
            maxPrice: [{ $group: { _id: null, max: { $max: "$priceB2C" } } }],
          },
        },
      ]),
      Product.aggregate([
        { $match: productFilter },
        { $group: { _id: "$category", productCount: { $sum: 1 } } },
      ]),
    ]);

    const products = JSON.parse(JSON.stringify(productDocs)).map(
      (p: { _id: string }) => ({
        ...p,
        images: [`/api/media/product/${p._id}?i=0`],
      })
    );
    const facets = facetResult[0] ?? { brands: [], tags: [], maxPrice: [] };

    // Attach per-subcategory counts from the aggregation result
    const countByCategory = new Map<string, number>(
      subcategoryCounts.map((c: { _id: unknown; productCount: number }) => [
        String(c._id),
        c.productCount,
      ])
    );
    const subcategoriesWithCounts = subcategories.map(
      (sub: { _id: string; name: string; slug: string }) => ({
        ...sub,
        productCount: countByCategory.get(String(sub._id)) ?? 0,
      })
    );

    // Look up brand details only for brands that actually appear in this category
    const brandCountByName = new Map<string, number>(
      facets.brands.map((b: { _id: string; productCount: number }) => [b._id, b.productCount])
    );
    const brandDocs = await Brand.find({
      name: { $in: [...brandCountByName.keys()] },
      isActive: true,
    })
      // `logo` omitted for the same reason as product images: every one of the
      // 43 brand logos is an inline base64 blob.
      .select("_id name slug")
      .lean();

    const brandWithCounts = JSON.parse(JSON.stringify(brandDocs)).map(
      (brand: { _id: string; name: string }) => ({
        ...brand,
        logo: `/api/media/brand/${brand._id}`,
        productCount: brandCountByName.get(brand.name) ?? 0,
      })
    );

    const uniqueTags = facets.tags.map((t: { _id: string }) => t._id).filter(Boolean);
    const maxPrice = facets.maxPrice[0]?.max || 100000;

    return {
      category,
      parentCategory,
      subcategories: subcategoriesWithCounts,
      products,
      totalProducts,
      brands: brandWithCounts,
      tags: uniqueTags,
      maxPrice: Math.ceil(maxPrice / 1000) * 1000,
      isSubcategory,
    };
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
});

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getCategoryData(slug);
  
  if (!data) {
    return { title: "Category Not Found" };
  }
  
  const title = data.category.name;
  const description = data.category.description || `Browse ${data.category.name} products at ${siteConfig.name}. Find the best deals on quality ${data.category.name.toLowerCase()} items.`;
  
  return {
    title,
    description,
    alternates: {
      canonical: getCanonicalUrl(`/category/${slug}`),
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: getCanonicalUrl(`/category/${slug}`),
      images: data.category.image ? [data.category.image] : undefined,
    },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const data = await getCategoryData(slug);

  if (!data) {
    notFound();
  }

  const { category, parentCategory, subcategories, products, totalProducts, brands, tags, maxPrice, isSubcategory } = data;

  // Build breadcrumb items
  const breadcrumbItems = [];
  if (isSubcategory && parentCategory) {
    breadcrumbItems.push({
      label: parentCategory.name,
      href: `/category/${parentCategory.slug}`,
    });
  }
  breadcrumbItems.push({ label: category.name });

  // Schema markup
  const schemas = [
    generateOrganizationSchema(),
    generateCollectionPageSchema(
      {
        name: category.name,
        slug: slug,
        description: category.description || `Browse ${category.name} products`,
        image: category.image,
        productCount: totalProducts,
      },
      "category",
      products.slice(0, 10)
    ),
  ];

  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8FA]">
      <Header />
      <main className="flex-1">
        {/* Schema */}
        <JsonLd data={schemas} />

        {/* Breadcrumb */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Category header */}
        <div className="border-b border-border bg-white px-3 py-4 md:px-4 md:py-6">
          <div className="mx-auto max-w-7xl">
            {/* Show parent category if subcategory */}
            {isSubcategory && parentCategory && (
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-primary md:text-xs">
                {parentCategory.name}
              </p>
            )}
            <h1 className="text-lg font-extrabold text-foreground md:text-2xl">
              {category.name}
            </h1>
            {category.description && (
              <p className="mt-1 text-xs text-muted-foreground md:text-sm">
                {category.description}
              </p>
            )}
            <p className="mt-1.5 text-[10px] font-medium text-muted-foreground md:text-xs">
              {totalProducts} {totalProducts === 1 ? "product" : "products"} found
            </p>
          </div>
        </div>

        {/* Client interactive section */}
        <CategoryPageClient
          products={products}
          subcategories={subcategories}
          brands={brands}
          availableTags={tags}
          maxPrice={maxPrice}
          categorySlug={slug}
          categoryName={category.name}
          isSubcategory={isSubcategory}
        />
      </main>
      <Footer />
    </div>
  );
}
