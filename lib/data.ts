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

// Max products rendered in a single homepage section row
const SECTION_PRODUCT_LIMIT = 10;
// How many candidates each matching pass may pull before de-duplication
const SECTION_CANDIDATE_LIMIT = 30;

// Sections that must never render on the homepage, no matter how they are
// configured in the admin or named in the catalogue.
const EXCLUDED_SECTION_PATTERNS: RegExp[] = [
  /wi[-\s]?fi|usb\s*adapt|wireless\s*adapt|network\s*adapt|dongle/i,
  /memory\s*card|micro\s*sd|\bsd\s*card|\bcf\s*card/i,
  /dash\s*cam/i,
  /\bsmps\b|switch(ed|ing)?\s*mode\s*power/i,
];

function isExcludedSection(title: string, slug?: string): boolean {
  return EXCLUDED_SECTION_PATTERNS.some(
    (pattern) => pattern.test(title) || (slug ? pattern.test(slug) : false)
  );
}

// Fallback slug for a rail that has no matching category in the catalogue.
function slugifySectionTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Words that carry no meaning when matching a product against a section title
// ("All Gaming Laptops Under 50K" -> gaming, laptop).
const SECTION_TITLE_STOP_WORDS = new Set([
  "all", "and", "the", "for", "with", "new", "best", "top", "our", "shop", "deals",
  "deal", "offer", "offers", "sale", "buy", "online", "price", "prices", "under",
  "product", "products", "category", "categories", "item", "items", "range",
  "collection", "featured", "popular", "trending", "more", "other", "others",
  "section", "store", "latest", "arrival", "arrivals",
]);

// Real-world vocabulary for each section heading. A catalogue rarely repeats the
// section title inside every product name ("Displays" -> "LG 24MK600 IPS
// Monitor"), so each heading word is expanded into the terms that actually show
// up in product names, tags and SKUs.
const SECTION_KEYWORD_SYNONYMS: Record<string, string[]> = {
  desktop: ["desktop", "all in one", "aio", "tower", "workstation", "cpu cabinet", "pc"],
  laptop: ["laptop", "notebook", "macbook", "ultrabook", "thinkpad", "ideapad", "vivobook", "chromebook", "inspiron", "latitude", "pavilion", "victus", "nitro", "tuf"],
  display: ["display", "monitor", "screen", "led monitor", "lcd", "ips", "curved"],
  monitor: ["monitor", "display", "screen", "led monitor", "lcd", "ips", "curved"],
  processor: ["processor", "cpu", "ryzen", "core i3", "core i5", "core i7", "core i9", "xeon", "threadripper", "athlon", "pentium", "celeron", "epyc", "ultra 5", "ultra 7"],
  storage: ["storage", "ssd", "hdd", "nvme", "hard disk", "hard drive", "sata", "m.2", "pen drive", "pendrive", "flash drive", "external drive", "nas", "sshd"],
  printer: ["printer", "inkjet", "laserjet", "laser printer", "deskjet", "ecotank", "toner", "cartridge", "mfp", "multifunction", "smart tank"],
  scanner: ["scanner", "flatbed", "document scanner", "barcode scanner"],
  peripheral: ["peripheral", "keyboard", "mouse", "combo", "headset", "headphone", "webcam", "speaker", "mousepad", "accessory", "accessories", "gamepad"],
  graphic: ["graphics", "graphic card", "gpu", "geforce", "radeon", "rtx", "gtx", "quadro"],
  graphics: ["graphics", "graphic card", "gpu", "geforce", "radeon", "rtx", "gtx", "quadro"],
  motherboard: ["motherboard", "mobo", "chipset", "b550", "b650", "h610", "b760", "z790"],
  memory: ["memory", "ram", "ddr3", "ddr4", "ddr5", "dimm", "sodimm"],
  ram: ["ram", "memory", "ddr3", "ddr4", "ddr5", "dimm", "sodimm"],
  cabinet: ["cabinet", "case", "chassis", "atx"],
  ups: ["ups", "inverter", "battery backup"],
  networking: ["networking", "router", "network switch", "access point", "lan", "ethernet"],
  network: ["network", "router", "network switch", "access point", "lan", "ethernet"],
  software: ["software", "license", "antivirus", "windows", "office", "subscription"],
  server: ["server", "rack", "poweredge", "proliant", "thinksystem"],
  tablet: ["tablet", "ipad", "tab"],
  projector: ["projector", "beam", "screen projector"],
  gaming: ["gaming", "gamer", "rgb", "esports"],
  accessory: ["accessory", "accessories", "cable", "adapter", "stand", "hub", "dock"],
  accessories: ["accessories", "accessory", "cable", "adapter", "stand", "hub", "dock"],
};

// "Displays" -> "display", "Accessories" -> "accessory".
function singularize(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && /(ses|shes|ches|xes|zes)$/.test(word)) return word.slice(0, -2);
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// Every search term a section heading should look for, deduplicated.
function sectionKeywords(title: string): string[] {
  const keywords = new Set<string>();

  for (const raw of title.toLowerCase().split(/[^a-z0-9.]+/)) {
    if (!raw || raw.length < 2) continue;
    if (SECTION_TITLE_STOP_WORDS.has(raw)) continue;

    const stem = singularize(raw);
    if (SECTION_TITLE_STOP_WORDS.has(stem)) continue;

    keywords.add(stem);
    for (const synonym of SECTION_KEYWORD_SYNONYMS[stem] ?? []) {
      keywords.add(synonym);
    }
  }

  return [...keywords];
}

// Builds one case-insensitive regex from the section's keywords. Short terms are
// word-bounded so "pc" can't match "pcie", multi-word terms tolerate hyphens and
// missing spaces ("hard disk" also matches "hard-disk" and "harddisk").
function keywordRegex(keywords: string[]): RegExp | null {
  const parts = keywords
    .map((keyword) => {
      const body = escapeRegex(keyword).replace(/(\\?\s)+/g, "[\\s\\-_]*");
      return keyword.length <= 3 ? `\\b${body}\\b` : body;
    })
    .filter(Boolean);

  if (parts.length === 0) return null;

  try {
    return new RegExp(parts.join("|"), "i");
  } catch {
    return null;
  }
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

// Loads the products for one homepage rail in strict relevance order:
//   1. in the section's own categories AND matching the heading's keywords
//   2. matching the heading's keywords anywhere in the catalogue
//   3. anything else in the section's categories (only to fill the row)
// Passes run in order and stop as soon as the row is full, so a rail always
// leads with products that genuinely belong under its title.
async function fetchSectionProducts(
  title: string,
  categoryIds: (string | { toString(): string })[]
): Promise<Record<string, unknown>[]> {
  const regex = keywordRegex(sectionKeywords(title));
  const active = { isActive: { $ne: false } };
  const inCategory = categoryIds.length > 0 ? { category: { $in: categoryIds } } : null;
  const matchesTitle = regex
    ? { $or: [{ name: regex }, { tags: regex }, { sku: regex }, { shortDescription: regex }] }
    : null;

  const passes: Record<string, unknown>[] = [];
  if (inCategory && matchesTitle) passes.push({ ...active, ...inCategory, ...matchesTitle });
  if (matchesTitle) passes.push({ ...active, ...matchesTitle });
  if (inCategory) passes.push({ ...active, ...inCategory });

  const seen = new Set<string>();
  const products: Record<string, unknown>[] = [];

  for (const filter of passes) {
    if (products.length >= SECTION_PRODUCT_LIMIT) break;

    const candidates = await findSectionCandidates(filter);
    for (const candidate of candidates) {
      const id = String((candidate._id as { toString(): string })?.toString() ?? "");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      products.push(candidate);
      if (products.length >= SECTION_PRODUCT_LIMIT) break;
    }
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
        .filter((s) => s.enabled && !isExcludedSection(s.title, s.slug))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      const sectionData: SectionData[] = [];

      // Fetch each section's products with a per-section LIMIT, in parallel.
      // Previously this ran one unbounded `Product.find({ category: { $in: ... } })`
      // which pulled every product of every featured category into memory just to
      // slice 10 off the front — a full collection scan on large catalogues.
      const sectionProducts = await Promise.all(
        enabledSections.map((section) => {
          if (section.productIds && section.productIds.length > 0) {
            return Product.find({ _id: { $in: section.productIds }, isActive: true })
              .select(PRODUCT_LIST_PROJECTION)
              .populate("brand", "name logo")
              .limit(SECTION_PRODUCT_LIMIT)
              .lean();
          }

          // Products that match BOTH the category and the heading come first,
          // then heading matches from anywhere, then the rest of the category.
          return fetchSectionProducts(
            section.title,
            section.categoryId ? [section.categoryId] : []
          );
        })
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
    const [perCategoryProducts, allSubcategories] = await Promise.all([
      Promise.all(
        categoriesWithProducts.map((cat) => fetchSectionProducts(cat.name, [cat._id]))
      ),
      Category.find({ parent: { $in: categoryIds }, isActive: true })
        .select("_id name slug parent")
        .sort({ sortOrder: 1 })
        .lean(),
    ]);

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

// The homepage always shows these category rails. Each one is matched against
// the real categories in the database by slug/name so the section links and
// products stay correct no matter how the catalogue is named
// ("monitors" vs "displays", "cpu" vs "processors", ...).
const CURATED_SECTIONS: { title: string; match: RegExp }[] = [
  { title: "Desktops", match: /desktop|all[-\s]?in[-\s]?one|workstation|\bpc\b/i },
  { title: "Laptops", match: /laptop|notebook|macbook|ultrabook/i },
  { title: "Displays", match: /display|monitor|screen/i },
  { title: "Processors", match: /processor|\bcpu\b|ryzen|\bcore\b/i },
  { title: "Storage", match: /storage|\bssd\b|\bhdd\b|hard\s*(disk|drive)|nvme|\bnas\b/i },
  { title: "Printers & Scanners", match: /printer|scanner|cartridge|toner|\bmfp\b/i },
  { title: "Peripherals", match: /peripheral|keyboard|\bmouse\b|headset|accessor/i },
];

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
      title: string;
      match: RegExp;
      category: CategoryNode | null;
      categoryIds: string[];
    }[] = [];

    for (const def of CURATED_SECTIONS) {
      if (isExcludedSection(def.title)) continue;

      const matches = categories.filter(
        (c) =>
          (def.match.test(c.name) || def.match.test(c.slug)) &&
          !isExcludedSection(c.name, c.slug)
      );

      if (matches.length === 0) {
        // No category for this rail yet — still show it if products match the
        // title by name, linking through to search instead of a category page.
        resolved.push({ title: def.title, match: def.match, category: null, categoryIds: [] });
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
        title: def.title,
        match: def.match,
        category: best,
        categoryIds: collectDescendantIds(id),
      });
    }

    if (resolved.length === 0) return [];

    const productsPerSection = await Promise.all(
      resolved.map((section) =>
        // Match on the rail's own heading plus the matched category name, so
        // "Displays" also picks up a "Monitors" category's products.
        fetchSectionProducts(
          section.category ? `${section.title} ${section.category.name}` : section.title,
          section.categoryIds
        )
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
        title: section.title,
        slug: category?.slug ?? slugifySectionTitle(section.title),
        subcategories: [
          { name: `All ${section.title}`, isActive: true },
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
