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
  SECTION_RULES,
  isExcludedSection,
  isPlaceholderSection,
  productFilterForRule,
  ruleForTitle,
  slugifySectionTitle,
  type SectionRule,
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
    .populate("brand", "name logo")
    .sort(SECTION_PRODUCT_SORT)
    .limit(SECTION_CANDIDATE_LIMIT)
    .lean() as unknown as Promise<Record<string, unknown>[]>;
}

// Resolves a rule's hand-checked category slugs to ids. Products in these
// categories are trusted even when the name alone is uninformative, which is how
// "Zeb V19HD LED" reaches the Displays rail.
//
// Every rule's slugs are resolved in ONE query and memoised for the duration of
// the request. Doing this per rail meant each of the ~10 rails opened its own
// Category query on top of its Product query, and with `maxPoolSize: 5` the
// homepage's fan-out exhausted the pool and died with
// "MongoWaitQueueTimeoutError: Timed out while checking out a connection".
let trustedCategoryIdCache: Map<string, unknown[]> | null = null;

async function trustedCategoryIdsByRule(): Promise<Map<string, unknown[]>> {
  if (trustedCategoryIdCache) return trustedCategoryIdCache;

  const allSlugs = Array.from(
    new Set(SECTION_RULES.flatMap((rule) => rule.categorySlugs))
  );

  const categories =
    allSlugs.length > 0
      ? ((await Category.find({ slug: { $in: allSlugs } })
          .select("_id slug")
          .lean()) as unknown as { _id: unknown; slug: string }[])
      : [];

  const idBySlug = new Map(categories.map((c) => [c.slug, c._id]));

  const byRule = new Map<string, unknown[]>();
  for (const rule of SECTION_RULES) {
    byRule.set(
      rule.key,
      rule.categorySlugs
        .map((slug) => idBySlug.get(slug))
        .filter((id): id is unknown => id !== undefined)
    );
  }

  trustedCategoryIdCache = byRule;
  return byRule;
}

// Runs async tasks with a hard concurrency cap, preserving input order.
//
// The Mongo pool is deliberately small (`maxPoolSize: 5`), and the homepage
// already fans out ~10 top-level fetches in parallel. Firing one more query per
// rail on top of that saturated the pool and every rail failed with
// "MongoWaitQueueTimeoutError", which the page surfaced as "No Products
// Available". Capping the rails at 2 in flight keeps them inside the pool budget.
const SECTION_QUERY_CONCURRENCY = 2;

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
 * When the heading maps to a curated rule the rail is filled strictly from that
 * rule, so every product genuinely belongs under the title. Admin-configured
 * rails with no matching rule fall back to their own category's products.
 */
async function fetchSectionProducts(
  title: string,
  slug: string | undefined,
  categoryIds: unknown[]
): Promise<Record<string, unknown>[]> {
  const rule = ruleForTitle(title, slug);

  let filter: Record<string, unknown>;
  if (rule) {
    const trustedByRule = await trustedCategoryIdsByRule();
    const trusted = [...(trustedByRule.get(rule.key) ?? []), ...categoryIds];
    filter = productFilterForRule(rule, trusted);
  } else if (categoryIds.length > 0) {
    filter = { isActive: { $ne: false }, category: { $in: categoryIds } };
  } else {
    return [];
  }

  const candidates = await findSectionCandidates(filter);

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
  images: { $slice: 2 }, // Only first 2 images
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
              .populate("brand", "name logo")
              .limit(SECTION_PRODUCT_LIMIT)
              .lean() as unknown as Promise<Record<string, unknown>[]>;
          }

          // Curated rules keep the rail on-topic; rails without a rule fall
          // back to their own category's products.
          return fetchSectionProducts(
            section.title,
            section.slug,
            section.categoryId ? [section.categoryId] : []
          );
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
      (cat) => fetchSectionProducts(cat.name, cat.slug, [cat._id])
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

    const flagged = await Product.find({ isActive: true, isNewArrival: true })
      .select(PRODUCT_LIST_PROJECTION)
      .populate("brand", "name logo")
      .sort({ createdAt: -1 })
      .limit(SECTION_PRODUCT_LIMIT)
      .lean();

    if (flagged.length >= SECTION_PRODUCT_LIMIT) {
      return flagged.map(mapProductToData);
    }

    const filler = await Product.find({
      isActive: true,
      _id: { $nin: flagged.map((p) => p._id) },
    })
      .select(PRODUCT_LIST_PROJECTION)
      .populate("brand", "name logo")
      .sort({ createdAt: -1 })
      .limit(SECTION_PRODUCT_LIMIT - flagged.length)
      .lean();

    return [...flagged, ...filler].map(mapProductToData);
  },
  ["new-arrivals"],
  { revalidate: CACHE_DURATIONS.medium, tags: [CACHE_TAGS.products] }
);

// ============================================
// CURATED CATEGORY SECTIONS
// ============================================

// The homepage always shows these category rails, in `SECTION_RULES` order.
// Each rail's products come from its rule (include/exclude patterns plus the
// hand-checked trusted categories), and the matched catalogue category is used
// only to build the section link and subcategory tabs — so a "Monitors"
// category still backs the "Displays" rail.

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
    const collectDescendantIds = (rootId: string): string[] => {
      const ids: string[] = [];
      const queue = [rootId];
      while (queue.length > 0) {
        const current = queue.shift() as string;
        ids.push(current);
        for (const child of childrenByParent.get(current) ?? []) {
          queue.push(child._id.toString());
        }
      }
      return ids;
    };

    const used = new Set<string>();
    const resolved: {
      rule: SectionRule;
      category: CategoryNode | null;
      categoryIds: string[];
    }[] = [];

    for (const rule of SECTION_RULES) {
      if (isExcludedSection(rule.title)) continue;

      const matches = categories.filter(
        (c) =>
          (rule.categoryMatch.test(c.name) || rule.categoryMatch.test(c.slug)) &&
          !isExcludedSection(c.name, c.slug)
      );

      if (matches.length === 0) {
        // No category for this rail yet — the rule's own include/exclude
        // patterns still fill it, linking through to search instead.
        resolved.push({ rule, category: null, categoryIds: [] });
        continue;
      }

      // Prefer the most generic match: a top-level category first, then the
      // shortest name (e.g. "Laptops" over "Gaming Laptops Under 50K").
      const best = [...matches].sort((a, b) => {
        const aDepth = a.parent ? 1 : 0;
        const bDepth = b.parent ? 1 : 0;
        if (aDepth !== bDepth) return aDepth - bDepth;
        return a.name.length - b.name.length;
      })[0];

      const id = best._id.toString();
      if (used.has(id)) continue;
      used.add(id);

      resolved.push({
        rule,
        category: best,
        categoryIds: collectDescendantIds(id),
      });
    }

    if (resolved.length === 0) return [];

    const productsPerSection = await Promise.all(
      resolved.map((section) =>
        // The rule's key resolves back to the same rule, so the rail is filled
        // strictly by its vetted include/exclude patterns plus its own
        // category tree.
        fetchSectionProducts(section.rule.title, section.rule.key, section.categoryIds)
      )
    );

    const sectionData: SectionData[] = [];

    for (let i = 0; i < resolved.length; i++) {
      const section = resolved[i];
      const products = productsPerSection[i];
      if (products.length === 0) continue;

      const category = section.category;
      const children = category
        ? (childrenByParent.get(category._id.toString()) ?? []).slice(0, 8)
        : [];

      sectionData.push({
        title: section.rule.title,
        slug: category?.slug ?? slugifySectionTitle(section.rule.title),
        subcategories: [
          { name: `All ${section.rule.title}`, isActive: true },
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
