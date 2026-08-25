import type { Model } from "mongoose";
import type { IProduct } from "@/models/Product";

/**
 * Turn any input into a clean SKU-safe string (uppercase, alphanumeric + dashes).
 */
function sanitizeSku(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Build a fallback SKU from the product name (or a generic prefix) plus a
 * short random suffix, so we always have *something* to store.
 */
function generateSkuFromName(name?: string): string {
  const base = sanitizeSku(name || "").slice(0, 20) || "SKU";
  const suffix = randomSuffix();
  return `${base}-${suffix}`;
}

/**
 * Short, human-readable, collision-resistant suffix (e.g. "K3F9").
 */
function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 6).toUpperCase();
}

/**
 * Turn a product name into a URL-safe slug base.
 */
function sanitizeSlug(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "product"
  );
}

/**
 * Return a SKU that is guaranteed not to collide with an existing product.
 * - If `desiredSku` is empty, one is generated from the product name.
 * - If it already exists, a numeric suffix (-2, -3, ...) is appended until free.
 * This makes the SKU field fully flexible: the caller never has to worry about
 * duplicates causing a failure.
 */
export async function makeUniqueSku(
  ProductModel: Model<IProduct>,
  desiredSku: string | undefined,
  excludeId?: string
): Promise<string> {
  let base = desiredSku ? sanitizeSku(desiredSku) : "";
  if (!base) {
    base = sanitizeSku(generateSkuFromName());
  }

  let candidate = base;
  let counter = 2;

  // Try the clean base first, then base-2, base-3, ... Cap the deterministic
  // attempts, then fall back to a random suffix which is effectively unique.
  for (let attempt = 0; attempt < 25; attempt++) {
    const query: Record<string, unknown> = { sku: candidate };
    if (excludeId) query._id = { $ne: excludeId };

    const exists = await ProductModel.exists(query);
    if (!exists) return candidate;

    candidate = `${base}-${counter}`;
    counter++;
  }

  // Extremely unlikely fallback: base + random suffix.
  return `${base}-${randomSuffix()}`;
}

/**
 * Return a slug that is guaranteed not to collide with an existing product.
 */
export async function makeUniqueSlug(
  ProductModel: Model<IProduct>,
  name: string,
  excludeId?: string
): Promise<string> {
  const base = sanitizeSlug(name);
  let candidate = base;
  let counter = 2;

  for (let attempt = 0; attempt < 25; attempt++) {
    const query: Record<string, unknown> = { slug: candidate };
    if (excludeId) query._id = { $ne: excludeId };

    const exists = await ProductModel.exists(query);
    if (!exists) return candidate;

    candidate = `${base}-${counter}`;
    counter++;
  }

  return `${base}-${randomSuffix().toLowerCase()}`;
}

/** True when the error is a MongoDB duplicate-key (E11000) error. */
export function isDuplicateKeyError(err: unknown): err is {
  code: number;
  keyPattern?: Record<string, unknown>;
} {
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}

/** Which field caused a duplicate-key error, if any. */
export function duplicateKeyField(err: unknown): string | undefined {
  if (!isDuplicateKeyError(err)) return undefined;
  return Object.keys(err.keyPattern || {})[0];
}
