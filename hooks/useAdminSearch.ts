"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

/**
 * Live-search hook for admin datatable pages.
 *
 * - Debounces the user's input (default 300 ms) and pushes a new URL.
 * - Select/dropdown changes are pushed immediately (no debounce needed).
 * - Always resets to page 1 on any filter change.
 *
 * Usage:
 *   const { searchValue, setSearchValue, updateParam } = useAdminSearch("/admin/products");
 */
export function useAdminSearch(basePath: string, debounceMs = 300) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Controlled value for the text input — initialised from the URL
  const [searchValue, setSearchValue] = useState(
    searchParams.get("search") ?? ""
  );

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Push an arbitrary key/value pair to the URL immediately
  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`${basePath}?${params.toString()}`);
    },
    [basePath, router, searchParams]
  );

  // Debounce the search input: push URL 300 ms after the user stops typing
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    debounceTimer.current = setTimeout(() => {
      const current = searchParams.get("search") ?? "";
      // Only push if the value actually changed (avoid spurious navigations)
      if (searchValue !== current) {
        updateParam("search", searchValue);
      }
    }, debounceMs);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchValue]);

  // Keep local state in sync when the URL changes externally (e.g. browser back)
  useEffect(() => {
    setSearchValue(searchParams.get("search") ?? "");
  }, [searchParams]);

  return { searchValue, setSearchValue, updateParam };
}
