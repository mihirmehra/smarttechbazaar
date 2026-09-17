import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import ImageKit from "imagekit";

// Lazily construct the ImageKit client so a missing env var doesn't crash the
// module at import time. Falls back to base64 storage if unavailable.
function getImageKit(): ImageKit | null {
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;

  if (!publicKey || !privateKey || !urlEndpoint) {
    return null;
  }

  return new ImageKit({ publicKey, privateKey, urlEndpoint });
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed." },
        { status: 400 }
      );
    }

    // Allow large banner/product images now that they go to ImageKit (CDN),
    // not into MongoDB as base64. Cap at 10MB as a sane safety limit.
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const imagekit = getImageKit();

    // Preferred path: upload to ImageKit and store only the CDN URL.
    // This keeps MongoDB documents tiny and avoids the pool-saturating
    // base64 payloads that caused upload failures and slow media loads.
    if (imagekit) {
      try {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const uniqueName = `${Date.now()}-${safeName}`;

        const uploaded = await imagekit.upload({
          file: buffer,
          fileName: uniqueName,
          folder: "/uploads",
          useUniqueFileName: true,
        });

        return NextResponse.json({
          url: uploaded.url,
          name: file.name,
          size: file.size,
          type: file.type,
        });
      } catch (uploadError) {
        console.error("[v0] ImageKit upload failed, falling back to base64:", uploadError);
        // fall through to base64 below
      }
    }

    // Fallback: base64 data URL (only used if ImageKit is unavailable).
    const base64 = buffer.toString("base64");
    const dataUrl = `data:${file.type};base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      name: file.name,
      size: file.size,
      type: file.type,
    });
  } catch (error) {
    console.error("Error processing file:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}
