import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import dbConnect from "@/lib/mongodb";
import Product from "@/models/Product";

/**
 * Serves a single product's first image.
 *
 * Most products in this database store their images as base64 data URIs inside
 * the document itself (documents reach 1.6MB). Embedding those in a product
 * list response makes the payload tens of megabytes and times the query out,
 * so list views only learn *that* an image exists and load it from here, one
 * request per row, decoded into real binary instead of a data URI.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (
      !session ||
      (session.user.role !== "admin" && session.user.role !== "super_admin")
    ) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await dbConnect();

    // Fetch only the first element of the images array so a product with many
    // large embedded images still costs a single small read.
    const product = await Product.findById(id)
      .select({ images: { $slice: 1 } })
      .lean<{ images?: string[] } | null>();

    const image = product?.images?.[0];

    if (!image) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Already-hosted images don't need to be proxied through this route.
    if (/^https?:\/\//.test(image)) {
      return NextResponse.redirect(image);
    }

    const match = /^data:([^;,]+);base64,([\s\S]+)$/.exec(image);

    if (!match) {
      return NextResponse.json(
        { error: "Unsupported image format" },
        { status: 415 }
      );
    }

    const [, contentType, base64] = match;
    const bytes = Buffer.from(base64, "base64");

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(bytes.byteLength),
        // These blobs are immutable for a given product revision, so let the
        // browser cache them and keep the list view snappy on repeat visits.
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[v0] Failed to load product thumbnail:", error);
    return NextResponse.json(
      { error: "Failed to load thumbnail" },
      { status: 500 }
    );
  }
}
