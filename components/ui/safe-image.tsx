"use client";

/**
 * Drop-in replacement for next/image's default export, used everywhere a
 * PRODUCT image is rendered (local /public files, ImageKit URLs, Blob URLs,
 * or any other host).
 *
 * Why this exists:
 * Product images can come from three different sources — ImageKit,
 * Vercel Blob, or a file placed directly in the /public folder. Next.js /
 * Vercel's Image Optimization API can reject some of these requests with
 * `400 INVALID_IMAGE_OPTIMIZE_REQUEST` (e.g. a locally-added file with a
 * space or special character in its name, an unusual local path shape, or a
 * host not covered by remotePatterns). Previously this produced a broken
 * image and, on some pages, a hard error.
 *
 * This component makes every product image resilient without adding any new
 * service or dependency:
 *   1. Normalizes the src (trims it, percent-encodes local /public paths so
 *      spaces/special characters can't break the optimizer request).
 *   2. If the OPTIMIZED request fails, it automatically retries the exact
 *      same file with `unoptimized` — this serves the raw file directly,
 *      bypassing the optimizer entirely, which works for local files and
 *      any remote host.
 *   3. If even the raw file fails to load (missing/broken file), it falls
 *      back to a neutral placeholder instead of a broken image icon.
 *
 * ImageKit-hosted images are unaffected and continue to be optimized
 * normally — this only kicks in for the request that actually fails.
 */

import NextImage, { type ImageProps } from "next/image";
import { useEffect, useState } from "react";

const PLACEHOLDER = "https://placehold.co/400x400?text=No+Image";

function isLocalSrc(src: ImageProps["src"]): boolean {
  return (
    typeof src === "string" &&
    !/^https?:\/\//i.test(src.trim()) &&
    !src.trim().startsWith("data:") &&
    !src.trim().startsWith("blob:")
  );
}

function normalizeSrc(src: ImageProps["src"]): ImageProps["src"] {
  if (typeof src !== "string") return src;

  const trimmed = src.trim();
  if (!trimmed) return PLACEHOLDER;

  // Remote URLs and data/blob URLs: leave untouched.
  if (
    /^https?:\/\//i.test(trimmed) ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }

  // Treat everything else as a local /public asset. Ensure a single leading
  // slash and percent-encode each path segment so filenames with spaces or
  // special characters (a common issue with manually-added product images)
  // can't produce a malformed optimizer request.
  const withLeadingSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  const [pathPart, queryPart] = withLeadingSlash.split("?");

  const encodedPath = pathPart
    .split("/")
    .map((segment) => {
      if (!segment) return segment;
      try {
        // Decode first in case it's already partially encoded, then encode
        // cleanly, so we never double-encode.
        return encodeURIComponent(decodeURIComponent(segment));
      } catch {
        return encodeURIComponent(segment);
      }
    })
    .join("/");

  return queryPart ? `${encodedPath}?${queryPart}` : encodedPath;
}

export default function SafeImage({
  src,
  unoptimized,
  onError,
  alt,
  ...props
}: ImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(() => normalizeSrc(src));
  // Public-folder assets are served directly. This avoids sending local paths
  // through /_next/image, which is the source of INVALID_IMAGE_OPTIMIZE_REQUEST.
  // ImageKit and other remote URLs remain optimized normally.
  const [bypassOptimizer, setBypassOptimizer] = useState(
    Boolean(unoptimized) || isLocalSrc(src)
  );
  const [failed, setFailed] = useState(false);

  // Re-normalize and reset fallback state whenever the caller passes a new src.
  useEffect(() => {
    setResolvedSrc(normalizeSrc(src));
    setBypassOptimizer(Boolean(unoptimized) || isLocalSrc(src));
    setFailed(false);
  }, [src, unoptimized]);

  if (failed) {
    return <NextImage {...props} src={PLACEHOLDER} alt={alt} unoptimized />;
  }

  return (
    <NextImage
      {...props}
      src={resolvedSrc}
      alt={alt}
      unoptimized={bypassOptimizer}
      onError={(event) => {
        if (!bypassOptimizer) {
          // The optimized request failed (e.g. INVALID_IMAGE_OPTIMIZE_REQUEST).
          // Retry the same file unoptimized instead of showing a broken image.
          setBypassOptimizer(true);
        } else {
          // The raw file itself couldn't load — the file is genuinely
          // missing or broken. Fall back to a placeholder.
          setFailed(true);
        }
        onError?.(event);
      }}
    />
  );
}
