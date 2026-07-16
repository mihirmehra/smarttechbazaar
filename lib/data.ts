import { unstable_cache } from "next/cache";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Banner from "@/models/Banner";
import Settings from "@/models/Settings";
import { CACHE_TAGS, CACHE_DURATIONS } from "@/lib/cache";

// ============================================
// PRODUCT DATA FUNCTIONS
// ============================================

interface ProductData {
  id: string;
  name: string;
  slug: string;
  image: string;
  secondImage?: string;
  priceB2C: number;
  priceB2B: number;
  mrp: number;
  inStock: boolean;
  brand: string;
  brandLogo?: string;
  productId?: string;
  itemCode?: string;
  rating?: number;
  description?: string;
  soldCount?: number;
  views?: number;
}

// Lean projection for product lists (only fields we need)
const PRODUCT_LIST_PROJECTION = {
  _id: 1,
  name: 1,
  slug: 1,
  images: { $slice: 2 }, // Only first 2 images
  priceB2C: 1,
  priceB2B: 1,
  mrp: 1,
  stock: 1,
  brand: 1,
  sku: 1,
  shortDescription: 1,
  soldCount: 1,
  views: 1,
  isFeatured: 1,
  isActive: 1,
} as const;

function mapProductToData(p: Record<string, unknown>): ProductData {
  const brandObj = p.brand as { name?: string; logo?: string } | string | undefined;
  const brandName = typeof brandObj === "object" && brandObj?.name 
    ? brandObj.name 
    : (typeof brandObj === "string" ? brandObj : "Generic");
  const brandLogo = typeof brandObj === "object" && brandObj?.logo ? brandObj.logo : undefined;
  
  return {
    id: (p._id as { toString(): string }).toString(),
    name: p.name as string,
    slug: p.slug as string,
    image: (p.images as string[])?.[0] || "https://picsum.photos/280/280",
    secondImage: (p.images as string[])?.[1],
    priceB2C: (p.priceB2C as number) || (p.mrp as number),
    priceB2B: (p.priceB2B as number) || (p.priceB2C as number) || (p.mrp as number),
    mrp: p.mrp as number,
    inStock: (p.stock as number) > 0,
    brand: brandName,
    brandLogo,
    productId: `P${(p._id as { toString(): string }).toString().slice(-4).toUpperCase()}`,
    itemCode: (p.sku as string) || (p._id as { toString(): string }).toString().slice(-6).toUpperCase(),
    rating: 0,
    description: (p.shortDescription as string) || (p.description as string)?.slice(0, 100),
    soldCount: (p.soldCount as number) || 0,
    views: (p.views as number) || 0,
  };
}

// Get best sellers - cached
export const getBestSellers = unstable_cache(
  async (): Promise<ProductData[]> => {
    await dbConnect();

    const products = await Product.find({
      isActive: true,
      isBestSeller: true,
    })
      .select(PRODUCT_LIST_PROJECTION)
      .populate("brand", "name logo")
      .sort({ soldCount: -1 })
      .limit(10)
      .lean();

    // If not enough best sellers, get more by soldCount
    if (products.length < 10) {
      const additionalProducts = await Product.find({
        isActive: true,
        _id: { $nin: products.map((p) => p._id) },
      })
        .select(PRODUCT_LIST_PROJECTION)
        .populate("brand", "name logo")
        .sort({ soldCount: -1 })
        .limit(10 - products.length)
        .lean();

      products.push(...additionalProducts);
    }

    return products.map(mapProductToData);
  },
  ["best-sellers"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.products] }
);

// Get most popular products - cached
export const getMostPopular = unstable_cache(
  async (): Promise<ProductData[]> => {
    await dbConnect();

    const products = await Product.find({ isActive: true })
      .select(PRODUCT_LIST_PROJECTION)
      .populate("brand", "name logo")
      .sort({ views: -1, isFeatured: -1 })
      .limit(10)
      .lean();

    return products.map(mapProductToData);
  },
  ["most-popular"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.products] }
);

// ============================================
// CATEGORY DATA FUNCTIONS
// ============================================

interface CategoryData {
  id: string;
  name: string;
  image: string;
  slug: string;
  productCount: number;
}

// Get categories with product counts using aggregation (single query, no N+1)
export const getCategories = unstable_cache(
  async (): Promise<CategoryData[]> => {
    await dbConnect();

    // First try to get root categories (parent: null), if none found get all active categories
    let categories = await Category.aggregate([
      { $match: { isActive: { $ne: false }, $or: [{ parent: null }, { parent: { $exists: false } }] } },
      { $sort: { sortOrder: 1, name: 1 } },
      { $limit: 14 },
      {
        $lookup: {
          from: "products",
          let: { catId: "$_id" },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ["$category", "$$catId"] }, { $ne: ["$isActive", false] }] } } },
            { $count: "n" },
          ],
          as: "productStats",
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          image: 1,
          slug: 1,
          productCount: { $ifNull: [{ $arrayElemAt: ["$productStats.n", 0] }, 0] },
        },
      },
    ]);

    // Fallback: if no root categories found, get all categories
    if (categories.length === 0) {
      categories = await Category.aggregate([
        { $match: { isActive: { $ne: false } } },
        { $sort: { sortOrder: 1, name: 1 } },
        { $limit: 14 },
        {
          $lookup: {
            from: "products",
            let: { catId: "$_id" },
            pipeline: [
              { $match: { $expr: { $and: [{ $eq: ["$category", "$$catId"] }, { $ne: ["$isActive", false] }] } } },
              { $count: "n" },
            ],
            as: "productStats",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            image: 1,
            slug: 1,
            productCount: { $ifNull: [{ $arrayElemAt: ["$productStats.n", 0] }, 0] },
          },
        },
      ]);
    }

    return categories.map((cat) => ({
      id: cat._id.toString(),
      name: cat.name,
      image: cat.image || "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=200&h=200&fit=crop",
      slug: cat.slug,
      productCount: cat.productCount,
    }));
  },
  ["categories"],
  { revalidate: CACHE_DURATIONS.long, tags: [CACHE_TAGS.categories] }
);

// ============================================
// BRAND DATA FUNCTIONS
// ============================================

interface BrandData {
  id: string;
  name: string;
  logo: string;
  slug: string;
  productCount?: number;
}

// Get brands - cached
export const getBrands = unstable_cache(
  async (): Promise<BrandData[]> => {
    await dbConnect();

    const brands = await Brand.find({ isActive: true })
      .select("_id name logo slug")
      .sort({ sortOrder: 1, name: 1 })
      .limit(20)
      .lean();

    return brands.map((brand) => ({
      id: brand._id.toString(),
      name: brand.name,
      logo: brand.logo || `https://picsum.photos/seed/${brand.slug}/120/60`,
      slug: brand.slug,
    }));
  },
  ["brands"],
  { revalidate: CACHE_DURATIONS.long, tags: [CACHE_TAGS.brands] }
);

// Get hot brands with product counts - cached
export const getHotBrands = unstable_cache(
  async (): Promise<BrandData[]> => {
    await dbConnect();

    const brands = await Brand.find({ isActive: true })
      .select("_id name logo slug productCount")
      .sort({ productCount: -1, sortOrder: 1 })
      .limit(12)
      .lean();

    return brands.map((brand) => ({
      id: brand._id.toString(),
      name: brand.name,
      logo: brand.logo || `https://picsum.photos/seed/${brand.slug}/120/60`,
      slug: brand.slug,
      productCount: brand.productCount || 0,
    }));
  },
  ["hot-brands"],
  { revalidate: CACHE_DURATIONS.long, tags: [CACHE_TAGS.brands] }
);

// ============================================
// BANNER DATA FUNCTIONS
// ============================================

interface BannerData {
  id: string;
  image: string;
  imageMobile?: string;
  alt: string;
  href: string;
}

const getBannersQuery = (position: string) => {
  const now = new Date();
  return {
    position,
    isActive: true,
    $or: [
      { startDate: null, endDate: null },
      { startDate: { $lte: now }, endDate: null },
      { startDate: null, endDate: { $gte: now } },
      { startDate: { $lte: now }, endDate: { $gte: now } },
    ],
  };
};

// Get hero slider banners - cached
export const getHeroSliderBanners = unstable_cache(
  async (): Promise<BannerData[]> => {
    await dbConnect();

    const banners = await Banner.find(getBannersQuery("hero_slider"))
      .select("_id image imageMobile title link")
      .sort({ sortOrder: 1 })
      .lean();

    return banners.map((b) => ({
      id: b._id.toString(),
      image: b.image,
      imageMobile: b.imageMobile,
      alt: b.title || "Banner",
      href: b.link || "/",
    }));
  },
  ["hero-banners"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.banners] }
);

// Get ad banners - cached
export const getAdBanners = unstable_cache(
  async (): Promise<BannerData[]> => {
    await dbConnect();

    const banners = await Banner.find(getBannersQuery("ad_banner"))
      .select("_id image imageMobile title link")
      .sort({ sortOrder: 1 })
      .lean();

    return banners.map((b) => ({
      id: b._id.toString(),
      image: b.image,
      imageMobile: b.imageMobile,
      alt: b.title || "Ad Banner",
      href: b.link || "/",
    }));
  },
  ["ad-banners"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.banners] }
);

// Get promo banners - cached
export const getPromoBanners = unstable_cache(
  async (): Promise<BannerData[]> => {
    await dbConnect();

    const banners = await Banner.find(getBannersQuery("promo"))
      .select("_id image imageMobile title link")
      .sort({ sortOrder: 1 })
      .limit(1)
      .lean();

    return banners.map((b) => ({
      id: b._id.toString(),
      image: b.image,
      imageMobile: b.imageMobile,
      alt: b.title || "Promo Banner",
      href: b.link || "/",
    }));
  },
  ["promo-banners"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.banners] }
);

// ============================================
// HOMEPAGE SECTIONS DATA
// ============================================

interface SubcategoryTab {
  name: string;
  href?: string;
  isActive?: boolean;
}

interface SectionData {
  title: string;
  slug: string;
  subcategories: SubcategoryTab[];
  products: ProductData[];
}

interface HomepageSection {
  categoryId: string;
  title: string;
  slug: string;
  enabled: boolean;
  sortOrder: number;
  productIds?: string[];
  subcategories: string[];
}

// Get homepage sections - cached
export const getHomepageSections = unstable_cache(
  async (): Promise<SectionData[]> => {
    await dbConnect();

    // Try to get homepage settings from database
    const homepageSettings = await Settings.findOne({ key: "homepage_sections" }).lean();

    if (homepageSettings?.value && Array.isArray(homepageSettings.value) && homepageSettings.value.length > 0) {
      const sections = homepageSettings.value as HomepageSection[];
      const enabledSections = sections
        .filter((s) => s.enabled)
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const sectionData: SectionData[] = [];

      // Batch fetch all products for all sections at once
      const allCategoryIds = enabledSections.map(s => s.categoryId).filter(Boolean);
      const allProductIds = enabledSections.flatMap(s => s.productIds || []);
      
      const [categoryProducts, specificProducts] = await Promise.all([
        allCategoryIds.length > 0 
          ? Product.find({ category: { $in: allCategoryIds }, isActive: true })
              .select(PRODUCT_LIST_PROJECTION)
              .populate("brand", "name logo")
              .sort({ isFeatured: -1, soldCount: -1 })
              .lean()
          : [],
        allProductIds.length > 0
          ? Product.find({ _id: { $in: allProductIds }, isActive: true })
              .select(PRODUCT_LIST_PROJECTION)
              .populate("brand", "name logo")
              .lean()
          : [],
      ]);

      for (const section of enabledSections) {
        let products: typeof categoryProducts;

        if (section.productIds && section.productIds.length > 0) {
          products = specificProducts.filter(p => 
            section.productIds!.includes(p._id.toString())
          ).slice(0, 10);
        } else if (section.categoryId) {
          products = categoryProducts.filter(p => 
            p.category?.toString() === section.categoryId
          ).slice(0, 10);
        } else {
          continue;
        }

        if (products.length === 0) continue;

        const subcategoryTabs: SubcategoryTab[] = (section.subcategories || []).map((name, idx) => ({
          name,
          href: idx === 0 ? undefined : `/category/${section.slug}/${name.toLowerCase().replace(/\s+/g, "-")}`,
          isActive: idx === 0,
        }));

        if (subcategoryTabs.length === 0) {
          subcategoryTabs.push({ name: `All ${section.title}`, isActive: true });
        }

        sectionData.push({
          title: section.title,
          slug: section.slug,
          subcategories: subcategoryTabs,
          products: products.map(mapProductToData),
        });
      }

      if (sectionData.length > 0) {
        return sectionData;
      }
    }

    // Fallback: fetch default sections based on categories with products
    const categoriesWithProducts = await Category.aggregate([
      { $match: { isActive: true, parent: null } },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "category",
          as: "products",
          pipeline: [
            { $match: { isActive: true } },
            { $limit: 10 },
          ],
        },
      },
      { $match: { "products.0": { $exists: true } } },
      { $sort: { sortOrder: 1 } },
      { $limit: 4 },
    ]);

    const sectionData: SectionData[] = [];

    // Batch fetch all data at once
    const categoryIds = categoriesWithProducts.map(c => c._id);
    const [allProducts, allSubcategories] = await Promise.all([
      Product.find({ category: { $in: categoryIds }, isActive: true })
        .select(PRODUCT_LIST_PROJECTION)
        .populate("brand", "name logo")
        .sort({ isFeatured: -1, soldCount: -1 })
        .lean(),
      Category.find({ parent: { $in: categoryIds }, isActive: true })
        .select("_id name slug parent")
        .sort({ sortOrder: 1 })
        .lean(),
    ]);

    for (const cat of categoriesWithProducts) {
      const products = allProducts
        .filter(p => p.category?.toString() === cat._id.toString())
        .slice(0, 10);

      const subcategories = allSubcategories.filter(
        s => s.parent?.toString() === cat._id.toString()
      ).slice(0, 8);

      const subcategoryTabs: SubcategoryTab[] = [
        { name: `All ${cat.name}`, isActive: true },
        ...subcategories.map((sub) => ({
          name: sub.name,
          href: `/category/${cat.slug}/${sub.slug}`,
        })),
      ];

      sectionData.push({
        title: cat.name,
        slug: cat.slug,
        subcategories: subcategoryTabs,
        products: products.map(mapProductToData),
      });
    }

    return sectionData;
  },
  ["homepage-sections"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.products, CACHE_TAGS.categories, CACHE_TAGS.settings] }
);
