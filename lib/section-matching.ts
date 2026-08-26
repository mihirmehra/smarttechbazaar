/**
 * Homepage section matching.
 *
 * The catalogue's category tree cannot be trusted on its own: parent categories
 * hold no products, and several leaf categories are mislabelled (a wireless
 * mouse filed under "CPU"). A plain keyword search on the section title is just
 * as unreliable in the other direction — "Desktop" matches "Ryzen 5 8500G
 * Desktop Processor", "Storage" matches an NVR that "supports HDD up to 6TB",
 * and "Laptop" matches a keyboard combo "for Desktops and Laptops".
 *
 * So each rail is described by an explicit rule: the product names/tags that
 * genuinely belong to it (`include`), the ones that look like a match but don't
 * (`exclude`), and the specific, hand-checked categories whose products can be
 * trusted wholesale (`categorySlugs`). A product must match `include` and must
 * not match `exclude`, which keeps every rail honest to its own title.
 */

// Max products rendered in a single homepage section row
export const SECTION_PRODUCT_LIMIT = 10;
// How many candidates each matching pass may pull before de-duplication
export const SECTION_CANDIDATE_LIMIT = 30;

/**
 * Sections that must never render on the homepage, no matter how they are
 * configured in the admin or named in the catalogue.
 */
const EXCLUDED_SECTION_PATTERNS: RegExp[] = [
  /wi[-\s]?fi|usb\s*adapt|wireless\s*adapt|network\s*adapt|dongle/i,
  /memory\s*card|micro\s*sd|\bsd\s*card|\bcf\s*card/i,
  /dash\s*cam/i,
  /\bsmps\b|switch(ed|ing)?\s*mode\s*power/i,
];

export function isExcludedSection(title: string, slug?: string): boolean {
  return EXCLUDED_SECTION_PATTERNS.some(
    (pattern) => pattern.test(title) || (slug ? pattern.test(slug) : false)
  );
}

/**
 * Placeholder headings saved by the admin UI that carry no meaning. A rail
 * titled "category" can never be matched to real products, so it is skipped in
 * favour of the curated rails.
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

export interface SectionRule {
  /** Stable key, also used as the rail's fallback slug. */
  key: string;
  /** Heading shown on the homepage. */
  title: string;
  /** Matches the catalogue category that backs this rail (for links + tabs). */
  categoryMatch: RegExp;
  /** Product names/tags that genuinely belong under this heading. */
  include: RegExp;
  /** Look-alikes that must never appear under this heading. */
  exclude: RegExp;
  /** Hand-checked category slugs whose products are trusted wholesale. */
  categorySlugs: string[];
}

// This catalogue is surveillance-heavy, and camera/recorder specs mention
// almost every other product type ("supports HDD up to 8TB", "4K HDMI output").
// Every rail except Security shares this exclusion.
const SURVEILLANCE_NOISE =
  "\\bnvr\\b|\\bdvr\\b|network video recorder|digital video recorder|surveillance|\\bcctv\\b|\\bipc\\b|bullet camera|dome camera|turret camera|\\bcamera\\b|access terminal|door phone|\\bvdp\\b|intercom";

function withNoise(pattern: string): RegExp {
  return new RegExp(`${pattern}|${SURVEILLANCE_NOISE}`, "i");
}

export const SECTION_RULES: SectionRule[] = [
  {
    key: "desktops",
    title: "Desktops",
    categoryMatch: /^desktops?$|all[-\s]?in[-\s]?one|workstation/i,
    // "Desktop" on its own is far too weak — it appears in "Ryzen 5 8500G
    // Desktop Processor" and "Desktop 5 Port Ethernet Switch" — so the word
    // only counts when it actually names a machine.
    include:
      /\bdesktop\s*(pc|computer|system|tower)\b|\ball[\s-]?in[\s-]?one\s*(pc|desktop|computer)\b|\baio\s*(pc|desktop)\b|workstation|computer case|\bcabinet\b|\bchassis\b/i,
    exclude: withNoise(
      "processor|ryzen|\\bcore\\s*i[3579]\\b|xeon|pentium|celeron|athlon|\\bkeyboard\\b|\\bmouse\\b|webcam|charger|\\badapter\\b|\\bram\\b|\\bddr[345]\\b|memory|\\bcable\\b|printer|speaker|headset|\\bmonitor\\b|projector|\\bswitch\\b|ethernet|\\bpoe\\b|motherboard|companion"
    ),
    categorySlugs: ["desktop", "computer-case", "cabinet"],
  },
  {
    key: "laptops",
    title: "Laptops",
    categoryMatch: /^laptops?$|branded laptops|refurbished laptops/i,
    include:
      /\blaptops?\b|\bnotebook\b|macbook|thinkpad|ideapad|vivobook|zenbook|chromebook|probook|elitebook|omnibook|inspiron|latitude|pavilion|victus|\bnitro\s*\d|\btuf\s*gaming\b/i,
    exclude: withNoise(
      "charger|\\badapter\\b|batter|\\bkeyboard\\b|\\bmouse\\b|\\bcombo\\b|webcam|\\bstand\\b|cooling pad|\\bscreen\\b|\\bbag\\b|sleeve|backpack|\\bram\\b|\\bddr[345]\\b|memory|spare|hinge|\\bfan\\b|\\bcable\\b|\\bcord\\b|\\bdock\\b|printer|\\bhub\\b|adaptor|speaker|pc\\s*/\\s*laptop|desktops? (and|&) laptops"
    ),
    categorySlugs: ["laptops", "branded-laptops", "refurbished-laptops"],
  },
  {
    key: "displays",
    title: "Displays",
    categoryMatch: /^display(s)?$|^monitors?$/i,
    include:
      /\bmonitors?\b|\bdisplays?\b|\bprojector\b|\btelevision\b|\bled\s*tv\b|\bsmart\s*tv\b/i,
    exclude: withNoise(
      "printer|\\bkeyboard\\b|\\bmouse\\b|\\bcombo\\b|\\bcable\\b|converter|wall mount|bracket|\\bmount kit\\b|monitoring"
    ),
    categorySlugs: ["display", "monitors", "televisions", "projectors"],
  },
  {
    key: "processors",
    title: "Processors",
    categoryMatch: /^processors?$/i,
    include:
      /\bprocessors?\b|\bcpu\b|ryzen|\bcore\s*i[3579]\b|\bcore\s*ultra\b|\bxeon\b|threadripper|\bepyc\b|\bpentium\b|\bceleron\b|\bathlon\b/i,
    exclude: withNoise(
      "\\bfan\\b|cooler|cooling|thermal|heatsink|paste|\\bkeyboard\\b|\\bmouse\\b|\\bcabinet\\b|computer case|\\bmotherboard\\b|\\bcable\\b|\\bram\\b|\\bddr[345]\\b|printer|\\bmonitor\\b"
    ),
    categorySlugs: ["processors"],
  },
  {
    key: "storage",
    title: "Storage",
    categoryMatch: /^storage$/i,
    include:
      /\bssd\b|\bhdd\b|\bnvme\b|hard\s*disk|hard\s*drive|\bsshd\b|pen\s*drive|pendrive|flash\s*drive|\bnas\b/i,
    exclude: withNoise(
      "\\bchannel\\b|recorder|\\bpoe\\b|\\bswitch\\b|\\bsata interface\\b|supporting hdd|\\bupto\\b|\\bup to\\b|motherboard|\\bngff\\b|m\\.2 slot|\\bmobo\\b"
    ),
    categorySlugs: [
      "storage",
      "internal-ssd",
      "external-ssd",
      "hard-disk",
      "pendrives",
      "nas-boxes",
    ],
  },
  {
    key: "printers-scanners",
    title: "Printers & Scanners",
    categoryMatch: /printers?\s*(&|and)\s*scanners?|^printers?$|^scanners?$/i,
    include:
      /\bprinters?\b|\bscanners?\b|cartridge|\btoner\b|ink\s*tank|ink\s*bottle|inkjet|laser\s*jet|laserjet|deskjet|ecotank|\bmfp\b|multi[\s-]?function/i,
    exclude: withNoise("\\brouter\\b|\\bmonitor\\b"),
    categorySlugs: [
      "printers-scanners",
      "printers",
      "scanners",
      "ink-bottles",
      "toner-cartridges",
      "cartridge",
      "barcode-scanner",
    ],
  },
  {
    key: "peripherals",
    title: "Peripherals",
    categoryMatch: /^peripherals?$/i,
    include:
      /\bkeyboards?\b|\bmouse\b|\bmouses\b|mouse\s*pad|mousepad|\bheadsets?\b|headphone|earbud|earphone|\bwebcam\b|\bspeakers?\b|gamepad|joystick|\bcombo\b|usb\s*hub|docking\s*station|presentation pointer|cooling pad|laptop stand/i,
    exclude: withNoise(
      "column speaker|ceiling speaker|analog speaker|\\bpa\\b\\s*system|amplifier|\\bmonitor\\b|projector|printer|\\blaptop keyboard\\b|laptop screen|\\bsmps\\b"
    ),
    categorySlugs: [
      "peripherals",
      "keyboards",
      "mouse",
      "mouses",
      "gamepads",
      "webcams",
      "webcam",
      "speakers",
      "speaker",
      "headset",
      "headphones",
      "earbuds",
      "mousepad",
      "usb-hub",
      "usb-hubs",
      "dock",
      "combo",
      "cooling-pad",
      "laptop-stand",
      "presentation-pointer",
    ],
  },
];

/**
 * Finds the rule that governs a heading. Admin-configured sections reuse a
 * curated rule when their title clearly refers to the same thing ("Monitors"
 * -> Displays), so those rails get the same quality of matching.
 */
export function ruleForTitle(title: string, slug?: string): SectionRule | null {
  const candidates = [title, slug ?? ""].filter(Boolean);

  for (const rule of SECTION_RULES) {
    if (candidates.some((value) => rule.categoryMatch.test(value))) return rule;
  }

  // Looser second pass: any heading word that is a strong signal for a rule.
  for (const rule of SECTION_RULES) {
    if (candidates.some((value) => rule.include.test(value) && !rule.exclude.test(value))) {
      return rule;
    }
  }

  return null;
}

/**
 * Mongo filter for the products that genuinely belong under a rule: the
 * include pattern must hit the name or tags, and the exclude pattern must miss
 * both. Trusted category slugs are resolved to ids by the caller and passed in
 * so their products join the rail even when the product name is uninformative
 * ("Zeb V19HD LED" in the Monitors category).
 */
export function productFilterForRule(
  rule: SectionRule,
  trustedCategoryIds: unknown[] = []
): Record<string, unknown> {
  const matchesName: Record<string, unknown>[] = [
    { name: rule.include },
    { tags: rule.include },
  ];

  if (trustedCategoryIds.length > 0) {
    matchesName.push({ category: { $in: trustedCategoryIds } });
  }

  return {
    isActive: { $ne: false },
    $and: [
      { $or: matchesName },
      { name: { $not: rule.exclude } },
    ],
  };
}
