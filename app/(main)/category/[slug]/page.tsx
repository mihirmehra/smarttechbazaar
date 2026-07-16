import { Metadata } from "next";
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

// Use dynamic rendering to avoid caching 404 responses
export const dynamic = "force-dynamic";

// Allow dynamic paths that weren't generated at build time
export const dynamicParams = true;

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

async function getCategoryData(slug: string) {
  try {
    await dbConnect();
    
    // First check if the slug is for a subcategory
    const categoryDoc = await Category.findOne({ slug, isActive: true }).lean();
    if (!categoryDoc) return null;

    const category = JSON.parse(JSON.stringify(categoryDoc));
    const categoryId = category._id;
    const isSubcategory = !!category.parent;
    
    let parentCategory = null;
    let subcategories: typeof category[] = [];
    let allCategoryIds: string[] = [categoryId];

    if (isSubcategory) {
      // This is a subcategory - get parent info for breadcrumb
      const parentDoc = await Category.findById(category.parent).lean();
      if (parentDoc) {
        parentCategory = JSON.parse(JSON.stringify(parentDoc));
      }
      // Only get products from this subcategory
      allCategoryIds = [categoryId];
      subcategories = []; // No sub-subcategories
    } else {
      // This is a main category - get all subcategories
      const subcategoryDocs = await Category.find({ 
        parent: categoryId, 
        isActive: true 
      })
        .sort({ sortOrder: 1 })
        .lean();
      
      subcategories = JSON.parse(JSON.stringify(subcategoryDocs));
      
      // Include main category AND all subcategory IDs for product query
      allCategoryIds = [categoryId, ...subcategories.map((s: { _id: string }) => s._id)];
    }

    // Get ALL products from this category and its subcategories
    const productDocs = await Product.find({ 
      category: { $in: allCategoryIds }, 
      isActive: true 
    })
      .populate("category", "name slug")
      .sort({ isFeatured: -1, createdAt: -1 })
      .lean();

    const products = JSON.parse(JSON.stringify(productDocs));

    // Calculate product count per subcategory
    const subcategoriesWithCounts = subcategories.map((sub: { _id: string; name: string; slug: string }) => ({
      ...sub,
      productCount: products.filter((p: { category?: { _id: string } }) => 
        p.category?._id === sub._id
      ).length,
    }));

    // Get unique brand names from products
    const brandNames = [...new Set(products.map((p: { brand?: string }) => p.brand).filter(Boolean))] as string[];
    
    // Get brand details for the brands used in this category
    const brandDocs = await Brand.find({ 
      name: { $in: brandNames }, 
      isActive: true 
    }).lean();

    // Count products per brand
    const brandWithCounts = JSON.parse(JSON.stringify(brandDocs)).map((brand: { name: string }) => ({
      ...brand,
      productCount: products.filter((p: { brand?: string }) => p.brand === brand.name).length,
    }));

    // Get unique tags from products
    const allTags = products.flatMap((p: { tags?: string[] }) => p.tags || []);
    const uniqueTags = [...new Set(allTags)] as string[];

    // Calculate max price
    const prices = products.map((p: { priceB2C: number }) => p.priceB2C);
    const maxPrice = prices.length > 0 ? Math.max(...prices) : 100000;

    return {
      category,
      parentCategory,
      subcategories: subcategoriesWithCounts,
      products,
      brands: brandWithCounts,
      tags: uniqueTags,
      maxPrice: Math.ceil(maxPrice / 1000) * 1000,
      isSubcategory,
    };
  } catch (error) {
    console.error("Error fetching category data:", error);
    return null;
  }
}

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

  const { category, parentCategory, subcategories, products, brands, tags, maxPrice, isSubcategory } = data;

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
        productCount: products.length,
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
              {products.length} {products.length === 1 ? "product" : "products"} found
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
