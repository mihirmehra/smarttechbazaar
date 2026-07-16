import { NextRequest, NextResponse } from "next/server";
import { revalidateTag, revalidatePath } from "next/cache";
import { CACHE_TAGS } from "@/lib/cache";

/**
 * Webhook endpoint for automatic cache revalidation
 * This can be triggered by:
 * 1. Vercel Deploy Hooks (after each deployment)
 * 2. GitHub Actions / CI pipelines
 * 3. Manual trigger from admin panel
 * 
 * Security: Requires a secret token for non-deployment calls
 */

// Secret token for webhook authentication
// Set this in your environment variables as REVALIDATION_SECRET
const REVALIDATION_SECRET = process.env.REVALIDATION_SECRET;

export async function POST(request: NextRequest) {
  try {
    // Check for Vercel deployment header (automatic on deploy)
    const isVercelDeploy = request.headers.get("x-vercel-signature");
    
    // Check for secret token
    const authHeader = request.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    
    // Allow if it's a Vercel deploy or has valid secret
    const isAuthorized = isVercelDeploy || (REVALIDATION_SECRET && token === REVALIDATION_SECRET);
    
    // If no secret is set, allow the request (for initial setup)
    // Once REVALIDATION_SECRET is set, require it
    if (REVALIDATION_SECRET && !isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Revalidate all cache tags
    const revalidatedTags: string[] = [];
    for (const tag of Object.values(CACHE_TAGS)) {
      revalidateTag(tag);
      revalidatedTags.push(tag);
    }

    // Revalidate critical paths
    const paths = [
      "/",
      "/products",
      "/brands",
      "/search",
    ];
    
    for (const path of paths) {
      revalidatePath(path);
    }

    return NextResponse.json({
      success: true,
      message: "All caches revalidated successfully",
      revalidated: {
        tags: revalidatedTags,
        paths,
      },
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Revalidation error:", error);
    return NextResponse.json(
      { error: "Failed to revalidate caches" },
      { status: 500 }
    );
  }
}

// GET endpoint for simple trigger (e.g., from browser or curl)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");
  
  // Check authorization
  if (REVALIDATION_SECRET && secret !== REVALIDATION_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Revalidate all cache tags
  const revalidatedTags: string[] = [];
  for (const tag of Object.values(CACHE_TAGS)) {
    revalidateTag(tag);
    revalidatedTags.push(tag);
  }

  // Revalidate critical paths
  const paths = ["/", "/products", "/brands", "/search"];
  for (const path of paths) {
    revalidatePath(path);
  }

  return NextResponse.json({
    success: true,
    message: "All caches revalidated",
    revalidated: { tags: revalidatedTags, paths },
    timestamp: Date.now(),
  });
}
