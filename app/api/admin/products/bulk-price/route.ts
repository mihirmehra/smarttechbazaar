import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import { logAdminAction } from "@/lib/activity-logger";
import { CACHE_TAGS, invalidateMemoryCache } from "@/lib/cache";

// Fields that may be bulk-edited. Restricting to this allowlist prevents an
// arbitrary field from being written through this endpoint.
const ALLOWED_FIELDS = ["priceB2C", "priceB2B", "mrp"] as const;
type PriceField = (typeof ALLOWED_FIELDS)[number];

const ALLOWED_MODES = [
  "set",
  "increase_amount",
  "decrease_amount",
  "increase_percent",
  "decrease_percent",
] as const;
type UpdateMode = (typeof ALLOWED_MODES)[number];

/**
 * PATCH — bulk update a single price field for many products at once.
 *
 * Body: {
 *   productIds: string[],
 *   field: "priceB2C" | "priceB2B" | "mrp",
 *   mode:  "set" | "increase_amount" | "decrease_amount"
 *        | "increase_percent" | "decrease_percent",
 *   value: number
 * }
 *
 * Because percentage/amount adjustments depend on each product's current
 * price, the new value is computed per document and written with a single
 * bulkWrite. Results are clamped to >= 0 (the schema's `min: 0`), so a large
 * decrease can never produce a negative price that would fail validation.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "super_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { productIds, field, mode } = body as {
      productIds?: unknown;
      field?: unknown;
      mode?: unknown;
    };
    const value = Number((body as { value?: unknown }).value);

    // --- Validate inputs ---
    if (!Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one product to update." },
        { status: 400 }
      );
    }

    if (productIds.length > 1000) {
      return NextResponse.json(
        { error: "You can update at most 1000 products at once." },
        { status: 400 }
      );
    }

    if (typeof field !== "string" || !ALLOWED_FIELDS.includes(field as PriceField)) {
      return NextResponse.json(
        { error: "Invalid price field." },
        { status: 400 }
      );
    }

    if (typeof mode !== "string" || !ALLOWED_MODES.includes(mode as UpdateMode)) {
      return NextResponse.json({ error: "Invalid update mode." }, { status: 400 });
    }

    if (!Number.isFinite(value) || value < 0) {
      return NextResponse.json(
        { error: "Enter a valid non-negative value." },
        { status: 400 }
      );
    }

    if (mode.endsWith("percent") && value > 100 && mode.startsWith("decrease")) {
      return NextResponse.json(
        { error: "A percentage decrease cannot exceed 100%." },
        { status: 400 }
      );
    }

    const priceField = field as PriceField;
    const updateMode = mode as UpdateMode;

    await dbConnect();

    // Only pull the ids and the one field we need to compute new values.
    const products = await Product.find({ _id: { $in: productIds } })
      .select(`_id ${priceField}`)
      .lean();

    if (products.length === 0) {
      return NextResponse.json(
        { error: "None of the selected products were found." },
        { status: 404 }
      );
    }

    const round2 = (n: number) => Math.round(n * 100) / 100;

    const operations = products.map((product) => {
      const current = Number((product as Record<string, unknown>)[priceField]) || 0;
      let next = current;

      switch (updateMode) {
        case "set":
          next = value;
          break;
        case "increase_amount":
          next = current + value;
          break;
        case "decrease_amount":
          next = current - value;
          break;
        case "increase_percent":
          next = current * (1 + value / 100);
          break;
        case "decrease_percent":
          next = current * (1 - value / 100);
          break;
      }

      // Clamp to the schema minimum so no update can fail validation.
      next = Math.max(0, round2(next));

      return {
        updateOne: {
          filter: { _id: product._id },
          update: { $set: { [priceField]: next } },
        },
      };
    });

    const result = await Product.bulkWrite(operations);
    const modifiedCount = result.modifiedCount ?? 0;

    await logAdminAction(
      session.user.id,
      session.user.name || "Admin",
      session.user.role as "admin" | "super_admin",
      "product_updated",
      `Bulk updated ${priceField} for ${products.length} products (${updateMode} ${value})`,
      "product",
      "bulk",
      { field: priceField, mode: updateMode, value, count: products.length }
    );

    // Invalidate storefront and admin caches so the new prices show up now.
    revalidateTag(CACHE_TAGS.products);
    revalidatePath("/products");
    revalidatePath("/");
    invalidateMemoryCache("admin:products");
    invalidateMemoryCache("admin:dashboard");

    return NextResponse.json({
      message: `Updated ${modifiedCount} product${modifiedCount === 1 ? "" : "s"}.`,
      matched: products.length,
      modified: modifiedCount,
    });
  } catch (error) {
    console.error("Error bulk updating prices:", error);
    return NextResponse.json(
      { error: "Failed to update prices" },
      { status: 500 }
    );
  }
}
