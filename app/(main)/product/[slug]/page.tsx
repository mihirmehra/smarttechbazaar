import { Metadata } from "next";
import { cache } from "react";
import { notFound } from "next/navigation";
import { unstable_cache } from "next/cache";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ProductGallery from "@/components/products/ProductGallery";
import ProductInfo from "@/components/products/ProductInfo";
import RelatedProducts from "@/components/products/RelatedProducts";
import ProductReviews from "@/components/products/ProductReviews";
import Breadcrumbs from "@/components/seo/Breadcrumbs";
import JsonLd from "@/components/seo/JsonLd";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
// Category must be imported to register its schema with Mongoose before any populate() call
import "@/models/Category";
import { siteConfig, getCanonicalUrl } from "@/lib/site-config";
import { generateProductSchema, generateOrganizationSchema } from "@/lib/schema";
import { CACHE_TAGS, CACHE_DURATIONS } from "@/lib/cache";

// Incrementally-static: the rendered page is cached and served from the edge,
// then revalidated in the background. Every admin product mutation calls
// revalidateTag(`product-<slug>`) + revalidatePath(`/product/<slug>`), so edits
// and newly-created products still appear immediately.
export const revalidate = 3600;

// Allow dynamic paths that weren't generated at build time
// This ensures new products are accessible immediately without 404
export const dynamicParams = true;

interface ProductPageProps {
  params: Promise<{ slug: string }>;
}

// Cached function for fetching product data
// This ensures data is cached and invalidated via tags, while page rendering stays dynamic
const getProductFromDb = async (slug: string) => {
  await dbConnect();

  // `-images` is the single most important part of this query. Most images in
  // this catalogue are stored as inline base64 data URIs on the document itself
  // (~873KB each), so selecting them made this page a 1.6MB payload that took
  // ~10s to render. The gallery now loads each image from /api/media/product/
  // <id>?i=<n> instead, which the browser fetches in parallel and caches
  // immutably. `imageCount` below is computed server-side so we know how many
  // URLs to emit without ever transferring a blob.
  const projection = "-images";

  // First try to find by slug with isActive: true
  let product = await Product.findOne({ slug, isActive: true })
    .select(projection)
    .populate("category", "name slug")
    .lean();

  // If not found, try without isActive filter (in case it's set to false by default)
  if (!product) {
    product = await Product.findOne({ slug })
      .select(projection)
      .populate("category", "name slug")
      .lean();
    
    // If found but inactive, still return null (product exists but is hidden)
    if (product && product.isActive === false) {
      return null;
    }
  }

  if (!product) {
    return null;
  }

  // How many images this product has, without downloading any of them.
  const [imageMeta] = await Product.aggregate<{ count: number }>([
    { $match: { _id: product._id } },
    { $project: { count: { $size: { $ifNull: ["$images", []] } } } },
  ]);
  const imageCount = Math.min(imageMeta?.count ?? 0, 8);
  const productId = String(product._id);
  const imageUrls = Array.from(
    { length: imageCount },
    (_, i) => `/api/media/product/${productId}?i=${i}`
  );

  // Get related products from same category (only if category exists)
  let relatedProducts: unknown[] = [];

  // Handle case where category might be an ObjectId or a populated object
  const categoryId = product.category && typeof product.category === 'object' && '_id' in product.category
    ? product.category._id
    : product.category;

  if (categoryId) {
    // Only select the fields the related-products carousel actually renders.
    // Previously this pulled entire documents (full HTML description, every
    // spec, all images) for 6 products and shipped them to the browser.
    relatedProducts = await Product.find({
      category: categoryId,
      _id: { $ne: product._id },
      isActive: true,
    })
      .select("_id name slug priceB2C priceB2B mrp stock sku brand")
      .limit(6)
      .lean();
  }

  // The carousel only ever shows the first image, so emit one media URL per
  // related product rather than the base64 blobs (6 x ~873KB).
  const relatedWithImages = (relatedProducts as { _id: unknown }[]).map((p) => ({
    ...p,
    images: [`/api/media/product/${String(p._id)}?i=0`],
  }));

  return {
    product: { ...JSON.parse(JSON.stringify(product)), images: imageUrls },
    relatedProducts: JSON.parse(JSON.stringify(relatedWithImages)),
  };
};

// Create cached version with proper cache tags
const getCachedProductData = (slug: string) => {
  return unstable_cache(
    () => getProductFromDb(slug),
    [`product-${slug}`],
    {
      revalidate: CACHE_DURATIONS.medium, // 60 seconds
      tags: [CACHE_TAGS.products, `product-${slug}`],
    }
  )();
};

// Wrapped in React `cache()` so the work is deduped within a single request.
// generateMetadata() and the page component both need this data; without the
// memo each page view ran the whole product + related-products query twice.
const getProductData = cache(async (slug: string) => {
  try {
    const cached = await getCachedProductData(slug);

    // IMPORTANT: unstable_cache caches whatever the function returns, including a
    // `null` "not found" result, for the full revalidate window. If a product URL
    // was ever requested before the product existed (a prefetch, a crawler, or a
    // draft that was later activated), that negative result would stick and the
    // page would keep returning 404 even after the product is live. To avoid that,
    // never trust a cached `null`: re-verify directly against the database before
    // serving a 404. A real, freshly-created product will be found here.
    if (cached?.product) {
      return cached;
    }

    return await getProductFromDb(slug);
  } catch (error) {
    console.error(`[v0] Error fetching product for slug ${slug}:`, error);
    // On error, try direct DB fetch without cache
    try {
      return await getProductFromDb(slug);
    } catch (fallbackError) {
      console.error(`[v0] Fallback fetch also failed:`, fallbackError);
      return null;
    }
  }
});

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const data = await getProductData(slug);

  if (!data) {
    return {
      title: "Product Not Found",
    };
  }

  const title = data.product.metaTitle || data.product.name;
  const description = data.product.metaDescription ||
    data.product.shortDescription ||
    data.product.description?.replace(/<[^>]*>/g, "").slice(0, 160) ||
    `Buy ${data.product.name} at ${siteConfig.name}. Best prices on ${data.product.brand || "quality"} products.`;

  return {
    title,
    description,
    alternates: {
      canonical: getCanonicalUrl(`/product/${slug}`),
    },
    openGraph: {
      title: `${title} | ${siteConfig.name}`,
      description,
      url: getCanonicalUrl(`/product/${slug}`),
      images: data.product.images?.[0] ? [data.product.images[0]] : undefined,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: `${title} | ${siteConfig.name}`,
      description,
      images: data.product.images?.[0] ? [data.product.images[0]] : undefined,
    },
  };
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const data = await getProductData(slug);

  // Return 404 if product not found
  if (!data?.product) {
    notFound();
  }

  const product = data.product;
  const relatedProducts = data.relatedProducts || [];

  // Schema markup
  const schemas = [
    generateOrganizationSchema(),
    generateProductSchema({
      name: product.name,
      slug: product.slug,
      description: product.description || "",
      images: product.images || [],
      priceB2C: product.priceB2C,
      mrp: product.mrp,
      stock: product.stock,
      sku: product.sku,
      brand: product.brand,
      category: product.category,
      specifications: product.specifications,
    }),
  ];

  // Breadcrumb items - handle case where category might not be populated
  const categoryName = product.category && typeof product.category === 'object' ? product.category.name : null;
  const categorySlug = product.category && typeof product.category === 'object' ? product.category.slug : null;
  
  const breadcrumbItems = [
    ...(categoryName && categorySlug ? [{ label: categoryName, href: `/category/${categorySlug}` }] : []),
    { label: product.name },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 bg-[#F7F8FA] pb-40 md:pb-0">
        {/* Schema */}
        <JsonLd data={schemas} />

        {/* Breadcrumb */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Product Section */}
        <section className="mx-auto max-w-7xl px-3 py-4 md:px-4 md:py-8">
          <div className="grid gap-4 md:gap-8 lg:grid-cols-2">
            {/* Gallery */}
            <ProductGallery images={product.images || []} name={product.name} />

            {/* Product Info */}
            <ProductInfo product={product} />
          </div>
        </section>

        {/* Description & Specs */}
        <section className="border-t border-border bg-card">
          <div className="mx-auto max-w-7xl px-3 py-5 md:px-4 md:py-8">
            <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
              {/* Description */}
              <div className="lg:col-span-2">
                <h2 className="heading-lg mb-4">Product Description</h2>
                <div
                  className="prose prose-sm max-w-none text-muted-foreground"
                  dangerouslySetInnerHTML={{
                    __html: product.description || "No description available.",
                  }}
                />
              </div>

              {/* Specifications */}
              <div>
                <h2 className="heading-lg mb-4">Specifications</h2>
                <div className="rounded-lg border border-border">
                  {product.specifications?.map(
                    (spec: { key: string; value: string }, index: number) => (
                      <div
                        key={spec.key}
                        className={`flex items-start justify-between gap-3 px-3 py-2.5 md:px-4 md:py-3 ${
                          index % 2 === 0 ? "bg-muted/50" : "bg-card"
                        }`}
                      >
                        <span className="body-sm shrink-0 font-medium text-foreground">
                          {spec.key}
                        </span>
                        <span className="body-sm min-w-0 break-words text-right text-muted-foreground">
                          {spec.value}
                        </span>
                      </div>
                    )
                  )}
                  {(!product.specifications ||
                    product.specifications.length === 0) && (
                    <div className="px-4 py-8 text-center text-muted-foreground">
                      No specifications available
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Reviews Section */}
        <section className="border-t border-border">
          <div className="mx-auto max-w-7xl px-3 py-5 md:px-4 md:py-8">
            <ProductReviews productId={product._id} productName={product.name} />
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <RelatedProducts products={relatedProducts} />
        )}
      </main>
      <Footer />
    </div>
  );
}
