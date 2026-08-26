import { unstable_cache } from "next/cache";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Category from "@/models/Category";
import Brand from "@/models/Brand";
import Banner from "@/models/Banner";
import Settings from "@/models/Settings";
import { CACHE_TAGS, CACHE_DURATIONS } from "@/lib/cache";
import {
  SECTION_PRODUCT_LIMIT,
  SECTION_CANDIDATE_LIMIT,
  HOMEPAGE_SECTIONS,
  HOMEPAGE_CATEGORY_SLUGS,
  isExcludedSection,
  isPlaceholderSection,
  slugifySectionTitle,
} from "@/lib/section-matching";

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

const SECTION_PRODUCT_SORT = { isFeatured: -1, soldCount: -1, createdAt: -1 } as const;

function findSectionCandidates(filter: Record<string, unknown>) {
  return Product.find(filter)
    .select(PRODUCT_LIST_PROJECTION)
    .populate("brand", "name")
    .sort(SECTION_PRODUCT_SORT)
    .limit(SECTION_CANDIDATE_LIMIT)
    .lean() as unknown as Promise<Record<string, unknown>[]>;
}

// Runs async tasks with a hard concurrency cap, preserving input order.
//
// The Mongo pool is deliberately small (`maxPoolSize: 5`), and the homepage
// already fans out ~10 top-level fetches in parallel. Firing one more query per
// rail on top of that saturated the pool and every rail failed with
// "MongoWaitQueueTimeoutError", which the page surfaced as "No Products
// Available". Running the rails one at a time keeps them inside the pool budget:
// the top-level homepage loader is itself already running a few fetches at once,
// so any nesting here multiplies out past `maxPoolSize` and starves the pool.
// Each rail query measures ~250ms, so serialising them costs ~2s total.
const SECTION_QUERY_CONCURRENCY = 1;

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await task(items[index], index);
    }
  });

  await Promise.all(workers);
  return results;
}

// The catalogue holds genuine duplicates (ten identical "iBall Computer Case"
// rows), so a rail is de-duplicated by id *and* by name to avoid showing the
// same product ten times.
function normalizeProductName(name: unknown): string {
  return String(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Loads the products for one homepage rail.
 *
 * The filter is a plain category match: every product filed under any of the
 * given category ids. Callers pass the rail's whole category subtree, since
 * products live on leaf categories rather than on the parent.
 */
async function fetchSectionProducts(
  categoryIds: unknown[]
): Promise<Record<string, unknown>[]> {
  if (categoryIds.length === 0) return [];

  const candidates = await findSectionCandidates({
    isActive: { $ne: false },
    category: { $in: categoryIds },
  });

  const seenIds = new Set<string>();
  const seenNames = new Set<string>();
  const products: Record<string, unknown>[] = [];

  for (const candidate of candidates) {
    if (products.length >= SECTION_PRODUCT_LIMIT) break;

    const id = String((candidate._id as { toString(): string })?.toString() ?? "");
    const name = normalizeProductName(candidate.name);
    if (!id || seenIds.has(id) || (name && seenNames.has(name))) continue;

    seenIds.add(id);
    if (name) seenNames.add(name);
    products.push(candidate);
  }

  return products;
}

// Lean projection for product lists (only fields we need)
const PRODUCT_LIST_PROJECTION = {
  _id: 1,
  name: 1,
  slug: 1,
  // Only the FIRST image. Images are stored as inline base64 data URIs averaging
  // ~873KB each, so `$slice: 2` pulled ~8.7MB for a single 10-product rail and
  // the query took ~90s (vs 217ms projecting `name` alone) — that transfer cost,
  // not query planning, is what timed the rails out. Dropping the second image
  // halves the payload; the card's hover image falls back to the first one.
  images: { $slice: 1 },
  priceB2C: 1,
  priceB2B: 1,
  mrp: 1,
  stock: 1,
  brand: 1,
  category: 1, // required by the homepage-section grouping below
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
      .populate("brand", "name")
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
        .populate("brand", "name")
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
      .populate("brand", "name")
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

// The homepage "Shop by Category" rail: exactly the main categories listed in
// HOMEPAGE_CATEGORY_SLUGS, in that order.
//
// getCategories() above cannot be used for this, because it takes the first 14
// *root* categories by sort order — and the catalogue has far more than 14 root
// categories (narrow ones such as "EZVIZ", "Security Camera", "Mouses" and
// "Audio Products" were created at the root too), so the rail was filled with
// those instead of the real top-level categories.
//
// The product count is a full subtree count, since products are filed on leaf
// categories and a top-level category holds none of its own.
export const getHomepageCategories = unstable_cache(
  async (): Promise<CategoryData[]> => {
    await dbConnect();

    const all = (await Category.find({ isActive: { $ne: false } })
      .select("_id name slug image parent")
      .lean()) as unknown as {
      _id: { toString(): string };
      name: string;
      slug: string;
      image?: string;
      parent?: { toString(): string } | null;
    }[];

    if (all.length === 0) return [];

    // Index children by parent so subtree ids resolve without extra queries.
    const childrenByParent = new Map<string, string[]>();
    for (const cat of all) {
      if (!cat.parent) continue;
      const key = cat.parent.toString();
      const siblings = childrenByParent.get(key) ?? [];
      siblings.push(cat._id.toString());
      childrenByParent.set(key, siblings);
    }

    const subtreeIds = (rootId: string): string[] => {
      const ids: string[] = [];
      const queue = [rootId];
      while (queue.length > 0) {
        const current = queue.shift() as string;
        ids.push(current);
        for (const child of childrenByParent.get(current) ?? []) {
          queue.push(child);
        }
      }
      return ids;
    };

    const bySlug = new Map(all.map((c) => [c.slug, c]));

    // Resolve the wanted categories first, then count products for all of them
    // in a single grouped query rather than one query per tile.
    const wanted = HOMEPAGE_CATEGORY_SLUGS.map((slug) => bySlug.get(slug)).filter(
      (c): c is (typeof all)[number] => c !== undefined
    );

    if (wanted.length === 0) return [];

    // Reuse the ids exactly as they came back from Mongo, so no ObjectId has to
    // be reconstructed from a string for the count query.
    const rawIdByString = new Map(all.map((c) => [c._id.toString(), c._id]));

    const idToRoot = new Map<string, string>();
    for (const cat of wanted) {
      const rootId = cat._id.toString();
      for (const id of subtreeIds(rootId)) {
        // First owner wins, so a shared descendant cannot be counted twice.
        if (!idToRoot.has(id)) idToRoot.set(id, rootId);
      }
    }

    const counts = await Product.aggregate<{ _id: unknown; n: number }>([
      {
        $match: {
          isActive: { $ne: false },
          category: {
            $in: Array.from(idToRoot.keys()).map((id) => rawIdByString.get(id)),
          },
        },
      },
      { $group: { _id: "$category", n: { $sum: 1 } } },
    ]);

    const countByRoot = new Map<string, number>();
    for (const row of counts) {
      const rootId = idToRoot.get(String(row._id));
      if (!rootId) continue;
      countByRoot.set(rootId, (countByRoot.get(rootId) ?? 0) + row.n);
    }

    return wanted.map((cat) => {
      const id = cat._id.toString();
      return {
        id,
        name: cat.name,
        image:
          cat.image ||
          "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=200&h=200&fit=crop",
        slug: cat.slug,
        productCount: countByRoot.get(id) ?? 0,
      };
    });
  },
  ["homepage-categories"],
  {
    revalidate: CACHE_DURATIONS.long,
    tags: [CACHE_TAGS.categories, CACHE_TAGS.products],
  }
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
        .filter(
          (s) =>
            s.enabled &&
            !isExcludedSection(s.title, s.slug) &&
            // The live settings document holds a junk row literally titled
            // "category"; such placeholders would render a meaningless rail.
            !isPlaceholderSection(s.title)
        )
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const sectionData: SectionData[] = [];

      // Fetch each section's products with a per-section LIMIT, in parallel.
      // Previously this ran one unbounded `Product.find({ category: { $in: ... } })`
      // which pulled every product of every featured category into memory just to
      // slice 10 off the front — a full collection scan on large catalogues.
      const sectionProducts = await mapWithConcurrency(
        enabledSections,
        SECTION_QUERY_CONCURRENCY,
        (section) => {
          if (section.productIds && section.productIds.length > 0) {
            return Product.find({ _id: { $in: section.productIds }, isActive: true })
              .select(PRODUCT_LIST_PROJECTION)
              .populate("brand", "name")
              .limit(SECTION_PRODUCT_LIMIT)
              .lean() as unknown as Promise<Record<string, unknown>[]>;
          }

          // Plain category filter: the rail shows its own category's products.
          return fetchSectionProducts(section.categoryId ? [section.categoryId] : []);
        }
      );

      for (let i = 0; i < enabledSections.length; i++) {
        const section = enabledSections[i];
        const products = sectionProducts[i];

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
          // Only need to know whether at least one product exists, so fetch a
          // single _id instead of whole documents.
          pipeline: [
            { $match: { isActive: true } },
            { $limit: 1 },
            { $project: { _id: 1 } },
          ],
        },
      },
      { $match: { "products.0": { $exists: true } } },
      { $sort: { sortOrder: 1 } },
      // Fetch a few extra so dropping excluded categories below still leaves 4.
      { $limit: 12 },
      { $project: { _id: 1, name: 1, slug: 1 } },
    ]).then((cats: { _id: { toString(): string }; name: string; slug: string }[]) =>
      cats.filter((cat) => !isExcludedSection(cat.name, cat.slug)).slice(0, 4)
    );

    const sectionData: SectionData[] = [];

    // Fetch subcategories in one query, and each category's products with a
    // per-category LIMIT in parallel, so we never load the whole catalogue.
    const categoryIds = categoriesWithProducts.map(c => c._id);
    const perCategoryProducts = await mapWithConcurrency(
      categoriesWithProducts,
      SECTION_QUERY_CONCURRENCY,
      (cat) => fetchSectionProducts([cat._id])
    );

    const allSubcategories = await Category.find({
      parent: { $in: categoryIds },
      isActive: true,
    })
      .select("_id name slug parent")
      .sort({ sortOrder: 1 })
      .lean();

    for (let i = 0; i < categoriesWithProducts.length; i++) {
      const cat = categoriesWithProducts[i];
      const products = perCategoryProducts[i];

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

// ============================================
// NEW ARRIVALS
// ============================================

// Newest products for the homepage rail. Prefers products explicitly flagged as
// new arrivals in the admin, then tops the row up with the most recently created
// products so the section is never half-empty.
export const getNewArrivals = unstable_cache(
  async (): Promise<ProductData[]> => {
    await dbConnect();

    // Deliberately ONE query, not a flagged-then-top-up pair. Product images are
    // stored as inline base64 data URIs, so each page of 10 products transfers
    // ~1.15MB and takes ~13s; issuing two of those sequentially while the other
    // rails compete for the 5-socket pool pushed this past the timeout and left
    // the section empty. `isActive: { $ne: false }` matches the rails so
    // products that simply lack the field are not silently dropped.
    const products = await Product.find({
      isActive: { $ne: false },
      isNewArrival: true,
    })
      .select(PRODUCT_LIST_PROJECTION)
      .populate("brand", "name")
      .sort({ createdAt: -1 })
      .limit(SECTION_PRODUCT_LIMIT)
      .lean();

    // Only fall back to "newest overall" when nothing is flagged at all, so the
    // rail still renders on a catalogue that never sets `isNewArrival`.
    if (products.length > 0) {
      return products.map(mapProductToData);
    }

    const newest = await Product.find({ isActive: { $ne: false } })
      .select(PRODUCT_LIST_PROJECTION)
      .populate("brand", "name")
      .sort({ createdAt: -1 })
      .limit(SECTION_PRODUCT_LIMIT)
      .lean();

    return newest.map(mapProductToData);
  },
  ["new-arrivals"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.products] }
);

// ============================================
// CURATED CATEGORY SECTIONS
// ============================================

// The homepage always shows these category rails, in `HOMEPAGE_SECTIONS` order.
// Each rail is a plain category filter: its products are every product filed
// under one of the rail's configured categories or any of their descendants.

type CategoryNode = {
  _id: { toString(): string };
  name: string;
  slug: string;
  parent?: { toString(): string } | null;
};

// Get the curated homepage category rails - cached
export const getCuratedSections = unstable_cache(
  async (): Promise<SectionData[]> => {
    await dbConnect();

    const categories = (await Category.find({ isActive: { $ne: false } })
      .select("_id name slug parent")
      .sort({ sortOrder: 1, name: 1 })
      .lean()) as unknown as CategoryNode[];

    if (categories.length === 0) return [];

    // Index children by parent id so we can walk the tree without extra queries.
    const childrenByParent = new Map<string, CategoryNode[]>();
    for (const cat of categories) {
      const key = cat.parent ? cat.parent.toString() : "root";
      const siblings = childrenByParent.get(key) ?? [];
      siblings.push(cat);
      childrenByParent.set(key, siblings);
    }

    // Products can live on leaf categories, so a rail must include every
    // descendant of the matched category, not just the category itself.
    // `skip` prunes whole sub-branches that are nested correctly but hold the
    // wrong products.
    const collectDescendantIds = (rootId: string, skip: Set<string>): string[] => {
      if (skip.has(rootId)) return [];
      const ids: string[] = [];
      const queue = [rootId];
      while (queue.length > 0) {
        const current = queue.shift() as string;
        ids.push(current);
        for (const child of childrenByParent.get(current) ?? []) {
          const childId = child._id.toString();
          if (skip.has(childId)) continue;
          queue.push(childId);
        }
      }
      return ids;
    };

    const categoryBySlug = new Map(categories.map((c) => [c.slug, c]));

    const resolved: {
      config: (typeof HOMEPAGE_SECTIONS)[number];
      category: CategoryNode | null;
      categoryIds: string[];
    }[] = [];

    for (const config of HOMEPAGE_SECTIONS) {
      if (isExcludedSection(config.title, config.slug)) continue;

      // Every configured slug contributes its whole subtree, because products
      // are filed on leaf categories rather than on the parent.
      const ids = new Set<string>();
      let linkedCategory: CategoryNode | null = null;

      const skip = new Set(
        (config.excludeCategorySlugs ?? [])
          .map((slug) => categoryBySlug.get(slug))
          .filter((c): c is CategoryNode => c !== undefined)
          .map((c) => c._id.toString())
      );

      for (const slug of config.categorySlugs) {
        const category = categoryBySlug.get(slug);
        if (!category) continue;

        // The first slug that exists becomes the rail's linked category, which
        // drives the section link and its subcategory tabs.
        if (!linkedCategory) linkedCategory = category;

        for (const id of collectDescendantIds(category._id.toString(), skip)) {
          ids.add(id);
        }
      }

      if (ids.size === 0) continue;

      resolved.push({
        config,
        category: linkedCategory,
        categoryIds: Array.from(ids),
      });
    }

    if (resolved.length === 0) return [];

    // Load the products for every rail in ONE query and bucket them in memory.
    //
    // One query per rail (even capped to 2 in flight) was too slow against this
    // cluster: eight rails serialised behind a 5-socket pool blew past the
    // homepage's 20s fetch budget, so `curatedSections` came back empty and the
    // page fell through to the admin sections / empty state. A single query over
    // the union of the rails' categories is one round trip instead of eight.
    const allCategoryIds = Array.from(
      new Set(resolved.flatMap((section) => section.categoryIds))
    );

    // Deliberately unsorted: asking Mongo to sort this union blew the server's
    // 32MB in-memory sort budget ("Sort exceeded memory limit ... did not opt in
    // to external sorting") because there is no index covering it. The result set
    // is small enough to order in JS below.
    const candidates = (await Product.find({
      isActive: { $ne: false },
      category: { $in: allCategoryIds },
    })
      .select(PRODUCT_LIST_PROJECTION)
      .populate("brand", "name")
      .lean()) as unknown as Record<string, unknown>[];

    const rank = (product: Record<string, unknown>) => ({
      featured: product.isFeatured ? 1 : 0,
      sold: Number(product.soldCount ?? 0),
    });

    candidates.sort((a, b) => {
      const left = rank(a);
      const right = rank(b);
      return right.featured - left.featured || right.sold - left.sold;
    });

    // Bucket by category so each rail can be filled from the shared result set.
    const byCategory = new Map<string, Record<string, unknown>[]>();
    for (const product of candidates) {
      const key = String(product.category ?? "");
      if (!key) continue;
      const bucket = byCategory.get(key);
      if (bucket) bucket.push(product);
      else byCategory.set(key, [product]);
    }

    const productsPerSection = resolved.map((section) => {
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const products: Record<string, unknown>[] = [];

      for (const categoryId of section.categoryIds) {
        for (const candidate of byCategory.get(categoryId) ?? []) {
          if (products.length >= SECTION_PRODUCT_LIMIT) return products;

          const id = String(
            (candidate._id as { toString(): string })?.toString() ?? ""
          );
          const name = normalizeProductName(candidate.name);
          // The catalogue holds genuine duplicates (ten identical "iBall
          // Computer Case" rows), so de-duplicate by name as well as by id.
          if (!id || seenIds.has(id) || (name && seenNames.has(name))) continue;

          seenIds.add(id);
          if (name) seenNames.add(name);
          products.push(candidate);
        }
      }

      return products;
    });

    const sectionData: SectionData[] = [];

    for (let i = 0; i < resolved.length; i++) {
      const section = resolved[i];
      const products = productsPerSection[i];
      if (products.length === 0) continue;

      const category = section.category;
      // Only offer subcategory tabs that actually hold products.
      const children = category
        ? (childrenByParent.get(category._id.toString()) ?? []).slice(0, 8)
        : [];

      sectionData.push({
        title: section.config.title,
        slug: category?.slug ?? slugifySectionTitle(section.config.title),
        subcategories: [
          { name: `All ${section.config.title}`, isActive: true },
          ...children.map((sub) => ({
            name: sub.name,
            href: category ? `/category/${category.slug}/${sub.slug}` : undefined,
          })),
        ],
        products: products.map(mapProductToData),
      });
    }

    return sectionData;
  },
  ["curated-sections"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.products, CACHE_TAGS.categories] }
);
