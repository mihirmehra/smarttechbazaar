import { NextResponse } from "next/server";
import mongoose from "mongoose";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";
import Brand from "@/models/Brand";
import Category from "@/models/Category";
import Banner from "@/models/Banner";

/**
 * Serves a single image that is stored INSIDE a MongoDB document.
 *
 * Why this route exists
 * ---------------------
 * Most images in this catalogue are stored as inline base64 data URIs on the
 * document itself (measured: 637/826 products, all 43 brand logos, 29
 * categories). A base64 product image averages ~873KB, so embedding them in
 * page payloads caused three compounding failures:
 *
 *   1. `unstable_cache` refuses to store an entry over 2MB. `getBrands()`
 *      returned 43 logos = 4,051,200 bytes, so Next.js threw
 *      "Failed to set Next.js data cache ... items over 2MB can not be cached"
 *      AFTER the value had already been returned — an unhandled rejection that
 *      aborted the render, which is why the homepage span forever.
 *   2. The queries themselves took 13s-90s. The cost is pure document
 *      transfer, not query planning: the same query projecting only `name`
 *      returns in ~210ms.
 *   3. `next build` failed, because a statically generated page has a hard 60s
 *      budget it could not possibly meet.
 *
 * Fetching the blob through its own URL fixes all three: list queries no longer
 * project the image field (so payloads are small and cacheable), and the
 * browser loads each image lazily and in parallel, then caches it immutably.
 *
 * A data URI is decoded to real bytes here, which is also ~25% smaller than the
 * base64 text it replaces. Images already hosted elsewhere (ImageKit, Blob) are
 * redirected instead, so they keep being served and optimized as before.
 */

const PLACEHOLDER = "https://placehold.co/400x400?text=No+Image";

// The blob for a given document/field never changes in place — the admin writes
// a new document version instead — so this can be cached aggressively.
const IMMUTABLE = "public, max-age=31536000, s-maxage=31536000, immutable";

type Kind = "product" | "brand" | "category" | "banner";

const FIELD_BY_KIND: Record<Exclude<Kind, "product" | "banner">, string> = {
  brand: "logo",
  category: "image",
};

function isKind(value: string): value is Kind {
  return (
    value === "product" ||
    value === "brand" ||
    value === "category" ||
    value === "banner"
  );
}

/** Decode `data:image/png;base64,AAAA...` into bytes plus its content type. */
function decodeDataUri(
  value: string
): { body: Buffer; contentType: string } | null {
  // `[\s\S]*` rather than `.*` with the `s` flag, which needs an es2018 target.
  const match = /^data:([^;,]+)(;base64)?,([\s\S]*)$/.exec(value);
  if (!match) return null;

  const [, contentType, isBase64, payload] = match;
  const body = isBase64
    ? Buffer.from(payload, "base64")
    : Buffer.from(decodeURIComponent(payload), "utf8");

  return { body, contentType: contentType || "application/octet-stream" };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ kind: string; id: string }> }
) {
  const { kind, id } = await params;

  if (!isKind(kind) || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.redirect(PLACEHOLDER, 307);
  }

  try {
    await dbConnect();

    const url = new URL(request.url);
    let raw: string | undefined;

    if (kind === "product") {
      // Project exactly ONE array element, so a product with several ~873KB
      // images still only transfers the one being displayed.
      const index = Math.max(0, Number(url.searchParams.get("i") ?? 0) || 0);
      const doc = await Product.findById(id)
        .select({ images: { $slice: [index, 1] } })
        .lean<{ images?: string[] }>();
      raw = doc?.images?.[0];
    } else if (kind === "banner") {
      // Banners carry a separate mobile crop; `f` picks which one.
      const field =
        url.searchParams.get("f") === "imageMobile" ? "imageMobile" : "image";
      const doc = await Banner.findById(id)
        .select(field)
        .lean<Record<string, string | undefined>>();
      raw = doc?.[field];
    } else if (kind === "brand") {
      const doc = await Brand.findById(id)
        .select(FIELD_BY_KIND.brand)
        .lean<Record<string, string | undefined>>();
      raw = doc?.[FIELD_BY_KIND.brand];
    } else {
      const doc = await Category.findById(id)
        .select(FIELD_BY_KIND.category)
        .lean<Record<string, string | undefined>>();
      raw = doc?.[FIELD_BY_KIND.category];
    }

    const value = raw?.trim();
    if (!value) {
      return NextResponse.redirect(PLACEHOLDER, 307);
    }

    // Already hosted somewhere else — hand the browser the real URL.
    if (/^https?:\/\//i.test(value)) {
      const response = NextResponse.redirect(value, 307);
      response.headers.set("Cache-Control", IMMUTABLE);
      return response;
    }

    const decoded = decodeDataUri(value);
    if (!decoded) {
      // A bare relative path stored in the DB: serve it from /public.
      if (value.startsWith("/")) {
        return NextResponse.redirect(new URL(value, url.origin), 307);
      }
      return NextResponse.redirect(PLACEHOLDER, 307);
    }

    return new NextResponse(new Uint8Array(decoded.body), {
      status: 200,
      headers: {
        "Content-Type": decoded.contentType,
        "Content-Length": String(decoded.body.byteLength),
        "Cache-Control": IMMUTABLE,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error(`[v0] media route failed (${kind}/${id}):`, error);
    // Never fail the page over one image.
    return NextResponse.redirect(PLACEHOLDER, 307);
  }
}
