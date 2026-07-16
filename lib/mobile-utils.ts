/**
 * Mobile App Utilities
 * Utilities for detecting mobile app wrappers (Median.co) and handling mobile-specific functionality
 */

/**
 * Detects if the app is running inside a mobile app wrapper (WebView)
 * Median.co injects a custom user agent or provides window.median object
 */
export function isRunningInMobileApp(): boolean {
  if (typeof window === "undefined") return false;
  
  // Check for Median.co specific indicators
  const hasMedian = "median" in window || "gonative" in window;
  
  // Check user agent for common WebView indicators
  const ua = navigator.userAgent.toLowerCase();
  const isWebView = 
    ua.includes("wv") || // Android WebView
    ua.includes("median") || // Median.co wrapper
    ua.includes("gonative") || // GoNative (Median.co's engine)
    (ua.includes("iphone") && !ua.includes("safari")) || // iOS WKWebView without Safari
    (ua.includes("android") && ua.includes("version/")); // Android WebView
  
  return hasMedian || isWebView;
}

/**
 * Detects the platform the app is running on
 */
export function getMobilePlatform(): "ios" | "android" | "web" {
  if (typeof window === "undefined") return "web";
  
  const ua = navigator.userAgent.toLowerCase();
  
  if (ua.includes("iphone") || ua.includes("ipad") || ua.includes("ipod")) {
    return "ios";
  }
  
  if (ua.includes("android")) {
    return "android";
  }
  
  return "web";
}

/**
 * Checks if the device is online
 */
export function isOnline(): boolean {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

/**
 * Get safe area insets for notched devices
 */
export function getSafeAreaInsets(): { top: number; bottom: number; left: number; right: number } {
  if (typeof window === "undefined") {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
  
  const computedStyle = getComputedStyle(document.documentElement);
  
  return {
    top: parseInt(computedStyle.getPropertyValue("--safe-area-inset-top") || "0", 10),
    bottom: parseInt(computedStyle.getPropertyValue("--safe-area-inset-bottom") || "0", 10),
    left: parseInt(computedStyle.getPropertyValue("--safe-area-inset-left") || "0", 10),
    right: parseInt(computedStyle.getPropertyValue("--safe-area-inset-right") || "0", 10),
  };
}

/**
 * Vibrate the device (for haptic feedback)
 */
export function vibrate(pattern: number | number[] = 50): void {
  if (typeof window === "undefined") return;
  if ("vibrate" in navigator) {
    navigator.vibrate(pattern);
  }
}

/**
 * Share content using native share dialog
 */
export async function shareContent(data: { title?: string; text?: string; url?: string }): Promise<boolean> {
  if (typeof window === "undefined") return false;
  
  if (navigator.share) {
    try {
      await navigator.share(data);
      return true;
    } catch {
      // User cancelled or share failed
      return false;
    }
  }
  
  // Fallback: copy URL to clipboard
  if (data.url) {
    try {
      await navigator.clipboard.writeText(data.url);
      return true;
    } catch {
      return false;
    }
  }
  
  return false;
}

/**
 * Request notification permission (for mobile apps)
 */
export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined") return "unsupported";
  
  if (!("Notification" in window)) {
    return "unsupported";
  }
  
  if (Notification.permission === "granted") {
    return "granted";
  }
  
  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission();
    return permission;
  }
  
  return Notification.permission;
}

/**
 * Opens URL in system browser (useful for external links in WebView)
 * Median.co provides methods to open URLs externally
 */
export function openExternalUrl(url: string): void {
  if (typeof window === "undefined") return;
  
  // Check for Median.co's external URL opener
  const median = (window as { median?: { share?: { open: (url: string) => void } } }).median;
  if (median?.share?.open) {
    median.share.open(url);
    return;
  }
  
  // Fallback: open in new tab/window
  window.open(url, "_blank", "noopener,noreferrer");
}

/**
 * Handle back navigation (for mobile app back button)
 */
export function handleBackNavigation(fallbackUrl: string = "/"): void {
  if (typeof window === "undefined") return;
  
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.location.href = fallbackUrl;
  }
}

/**
 * Scroll to top of page (useful after navigation in SPA)
 */
export function scrollToTop(smooth: boolean = true): void {
  if (typeof window === "undefined") return;
  
  window.scrollTo({
    top: 0,
    behavior: smooth ? "smooth" : "auto",
  });
}

/**
 * Prevents pull-to-refresh on mobile (useful for specific pages)
 */
export function preventPullToRefresh(element: HTMLElement): () => void {
  let touchStartY = 0;
  
  const handleTouchStart = (e: TouchEvent) => {
    touchStartY = e.touches[0].clientY;
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    const touchY = e.touches[0].clientY;
    const scrollTop = element.scrollTop;
    
    // Prevent if at top and trying to pull down
    if (scrollTop === 0 && touchY > touchStartY) {
      e.preventDefault();
    }
  };
  
  element.addEventListener("touchstart", handleTouchStart, { passive: true });
  element.addEventListener("touchmove", handleTouchMove, { passive: false });
  
  // Return cleanup function
  return () => {
    element.removeEventListener("touchstart", handleTouchStart);
    element.removeEventListener("touchmove", handleTouchMove);
  };
}
