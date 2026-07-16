"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { isMedianApp } from "@/lib/native-app";

interface DeepLinkHandler {
  pattern: RegExp;
  handler: (matches: RegExpMatchArray) => string;
}

const deepLinkHandlers: DeepLinkHandler[] = [
  // Product deep links
  {
    pattern: /^stb:\/\/product\/([a-zA-Z0-9]+)$/,
    handler: (matches) => `/product/${matches[1]}`,
  },
  // Category deep links
  {
    pattern: /^stb:\/\/category\/([a-zA-Z0-9-]+)$/,
    handler: (matches) => `/category/${matches[1]}`,
  },
  // Order deep links
  {
    pattern: /^stb:\/\/order\/([a-zA-Z0-9]+)$/,
    handler: (matches) => `/dashboard/orders/${matches[1]}`,
  },
  // Cart deep link
  {
    pattern: /^stb:\/\/cart$/,
    handler: () => "/cart",
  },
  // Dashboard deep links
  {
    pattern: /^stb:\/\/dashboard\/([a-zA-Z0-9-/]+)$/,
    handler: (matches) => `/dashboard/${matches[1]}`,
  },
  // Notification deep link
  {
    pattern: /^stb:\/\/notifications$/,
    handler: () => "/dashboard/notifications",
  },
];

export function useDeepLinking() {
  const router = useRouter();
  const pathname = usePathname();

  const handleDeepLink = useCallback((url: string) => {
    // Handle both custom scheme (stb://) and https deep links
    let normalizedUrl = url;
    
    // Convert https deep links to custom scheme format for processing
    if (url.startsWith("https://smarttechbazaar.com/")) {
      normalizedUrl = "stb://" + url.replace("https://smarttechbazaar.com/", "");
    } else if (url.startsWith("https://www.smarttechbazaar.com/")) {
      normalizedUrl = "stb://" + url.replace("https://www.smarttechbazaar.com/", "");
    }

    // Try to match against handlers
    for (const { pattern, handler } of deepLinkHandlers) {
      const matches = normalizedUrl.match(pattern);
      if (matches) {
        const path = handler(matches);
        router.push(path);
        return true;
      }
    }

    // If no handler matched but it's a valid path, navigate directly
    if (url.startsWith("/")) {
      router.push(url);
      return true;
    }

    return false;
  }, [router]);

  useEffect(() => {
    if (!isMedianApp()) return;

    // Listen for Median.co deep link events
    const handleMedianDeepLink = (event: CustomEvent) => {
      const url = event.detail?.url;
      if (url) {
        handleDeepLink(url);
      }
    };

    // Median.co fires a custom event for deep links
    window.addEventListener("median.deeplink" as keyof WindowEventMap, handleMedianDeepLink as EventListener);

    // Also check for initial deep link (app opened via deep link)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const median = (window as any).median;
    if (median?.initialUrl) {
      handleDeepLink(median.initialUrl);
    }

    return () => {
      window.removeEventListener("median.deeplink" as keyof WindowEventMap, handleMedianDeepLink as EventListener);
    };
  }, [handleDeepLink]);

  // Generate deep link URL for current page
  const getDeepLinkUrl = useCallback(() => {
    return `https://smarttechbazaar.com${pathname}`;
  }, [pathname]);

  // Generate app scheme deep link
  const getAppSchemeUrl = useCallback(() => {
    return `stb:/${pathname}`;
  }, [pathname]);

  return {
    handleDeepLink,
    getDeepLinkUrl,
    getAppSchemeUrl,
    currentPath: pathname,
  };
}

export default useDeepLinking;
