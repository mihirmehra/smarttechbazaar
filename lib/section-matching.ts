/**
 * Homepage section configuration.
 *
 * Each homepage rail is defined purely by the catalogue categories that feed
 * it — no name/keyword guessing. A rail's products are every product whose
 * `category` is the rail's root category or any of its descendants.
 *
 * Two things about the live catalogue make the `categorySlugs` list necessary:
 *
 *  1. Parent categories hold no products themselves (products live on leaves),
 *     so a rail must include the whole subtree of its root.
 *  2. A number of categories were created flat at the root instead of under
 *     their proper parent ("Security Camera", "Ethernet Switch", "Mouses"), so
 *     each rail also lists those strays explicitly.
 */

// Max products rendered in a single homepage section row
export const SECTION_PRODUCT_LIMIT = 10;
// How many candidates a section may pull before de-duplication
export const SECTION_CANDIDATE_LIMIT = 40;

export interface SectionConfig {
  /** Heading shown on the homepage, and the link/tab label. */
  title: string;
  /** Fallback slug when the root category can't be resolved. */
  slug: string;
  /**
   * Category slugs that feed this rail. The first slug that exists in the
   * catalogue becomes the rail's linked category (used for the section link and
   * its subcategory tabs); every listed slug contributes its whole subtree of
   * products.
   */
  categorySlugs: string[];
  /**
   * Sub-branches to drop from this rail's subtree. Used for categories that are
   * nested in the right place but hold the wrong products.
   */
  excludeCategorySlugs?: string[];
}

/** The homepage rails, in render order. */
export const HOMEPAGE_SECTIONS: SectionConfig[] = [
  {
    title: "Desktop",
    slug: "desktop",
    categorySlugs: ["desktop", "computer-case", "desktop-ram"],
    // "CPU" sits under Desktop but is a dumping ground: it holds toner
    // cartridges, mice, keyboards and monitors alongside actual processors, so
    // including it fills the Desktop rail with unrelated products.
    excludeCategorySlugs: ["cpu"],
  },
  {
    title: "Laptops",
    slug: "laptops",
    categorySlugs: [
      "laptops",
      "refurbished-laptops",
      "laptop-ram",
      "laptop-stand",
      "cooling-pad",
    ],
  },
  {
    title: "Storage",
    slug: "storage",
    categorySlugs: ["storage", "memory-card"],
  },
  {
    title: "Display",
    slug: "display",
    categorySlugs: ["display", "monitors", "televisions", "projectors"],
  },
  {
    title: "Peripherals",
    slug: "peripherals",
    categorySlugs: [
      "peripherals",
      "mouses",
      "mousepad",
      "webcam",
      "headset",
      "speaker",
      "earbuds",
      "usb-hub",
      "usb-hubs",
      "dock",
      "presentation-pointer",
      "combo",
    ],
  },
  {
    title: "Printers & Scanners",
    slug: "printers-scanners",
    categorySlugs: ["printers-scanners", "cartridge", "barcode-scanner"],
  },
  {
    title: "Security",
    slug: "security",
    categorySlugs: [
      "security",
      "security-camera",
      "digital-video-recorder",
      "video-intercom",
      "ip-vdp",
      "ezviz",
    ],
  },
  {
    title: "Networking",
    slug: "networking",
    categorySlugs: [
      "networking",
      "poe-switch",
      "ethernet-switch",
      "port-poe",
      "routers",
      "switches",
    ],
  },
];

/**
 * Sections that must never render on the homepage, no matter how they are
 * configured in the admin or named in the catalogue.
 */
const EXCLUDED_SECTION_PATTERNS: RegExp[] = [
  /wi[-\s]?fi\s*usb|usb\s*adapt|wireless\s*adapt|network\s*adapt/i,
  /memory\s*card/i,
  /dash\s*cam/i,
  /\bsmps\b/i,
];

export function isExcludedSection(title: string, slug?: string): boolean {
  return EXCLUDED_SECTION_PATTERNS.some(
    (pattern) => pattern.test(title) || (slug ? pattern.test(slug) : false)
  );
}

/**
 * Placeholder headings saved by the admin UI that carry no meaning. A rail
 * titled "category" can never be matched to real products, so it is skipped in
 * favour of the configured rails.
 */
const PLACEHOLDER_SECTION_TITLES = new Set([
  "category",
  "categories",
  "section",
  "sections",
  "untitled",
  "untitled section",
  "default",
  "new section",
  "test",
  "demo",
  "sample",
]);

export function isPlaceholderSection(title: string): boolean {
  return PLACEHOLDER_SECTION_TITLES.has(title.trim().toLowerCase());
}

export function slugifySectionTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
