"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname } from "next/navigation";

// Simple state machine for loading bar
type LoadingState = "idle" | "loading" | "completing" | "hiding";

// Routes that should show loading bar
const MAJOR_ROUTES = [
  "/",
  "/products",
  "/product/",
  "/category/",
  "/brand/",
  "/brands",
  "/cart",
  "/checkout",
  "/search",
  "/wishlist",
  "/dashboard",
  "/admin",
  "/auth/",
  "/about",
  "/privacy",
  "/terms",
  "/shipping",
  "/order-success",
];

function shouldShowLoadingBar(href: string): boolean {
  const path = href.split(/[?#]/)[0];
  return MAJOR_ROUTES.some(route => 
    route.endsWith("/") ? path.startsWith(route) : path === route || path.startsWith(route + "/")
  );
}

export function LoadingBar() {
  const pathname = usePathname();
  const barRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef<LoadingState>("idle");
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastPathRef = useRef(pathname);
  const clickedLinkRef = useRef<string | null>(null);

  // Cleanup all timers
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Update the bar visually
  const updateBar = useCallback((progress: number, visible: boolean) => {
    if (!barRef.current) return;
    barRef.current.style.width = `${progress}%`;
    barRef.current.style.opacity = visible ? "1" : "0";
  }, []);

  // Reset to idle state
  const reset = useCallback(() => {
    cleanup();
    stateRef.current = "idle";
    progressRef.current = 0;
    clickedLinkRef.current = null;
    updateBar(0, false);
  }, [cleanup, updateBar]);

  // Complete the loading bar
  const complete = useCallback(() => {
    if (stateRef.current === "idle" || stateRef.current === "hiding") return;
    
    cleanup();
    stateRef.current = "completing";
    progressRef.current = 100;
    updateBar(100, true);

    timeoutRef.current = setTimeout(() => {
      stateRef.current = "hiding";
      updateBar(100, false);
      
      timeoutRef.current = setTimeout(() => {
        reset();
      }, 200);
    }, 150);
  }, [cleanup, updateBar, reset]);

  // Start loading animation
  const startLoading = useCallback(() => {
    if (stateRef.current === "loading") return;
    
    cleanup();
    stateRef.current = "loading";
    progressRef.current = 0;
    updateBar(0, true);

    let lastTime = performance.now();
    
    const animate = (currentTime: number) => {
      if (stateRef.current !== "loading") return;

      const delta = currentTime - lastTime;
      lastTime = currentTime;

      // Slow down as we progress
      const speed = progressRef.current < 30 ? 0.08 :
                    progressRef.current < 50 ? 0.04 :
                    progressRef.current < 70 ? 0.02 :
                    progressRef.current < 85 ? 0.01 : 0.002;
      
      progressRef.current = Math.min(progressRef.current + delta * speed, 92);
      updateBar(progressRef.current, true);

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Small delay before showing
    timeoutRef.current = setTimeout(() => {
      progressRef.current = 5;
      updateBar(5, true);
      animationFrameRef.current = requestAnimationFrame(animate);
    }, 50);
  }, [cleanup, updateBar]);

  // Handle link clicks
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      // Don't start if already loading
      if (stateRef.current === "loading") return;

      const target = e.target as HTMLElement;
      const link = target.closest("a");
      if (!link) return;

      const href = link.getAttribute("href");
      if (!href) return;

      // Skip external links, hash links, etc.
      if (
        href.startsWith("http") ||
        href.startsWith("//") ||
        href.startsWith("#") ||
        href.startsWith("javascript:") ||
        href.startsWith("/api/") ||
        link.getAttribute("target") === "_blank" ||
        link.hasAttribute("download") ||
        link.hasAttribute("data-no-loading")
      ) {
        return;
      }

      // Skip same page navigation
      const hrefPath = href.split(/[?#]/)[0];
      if (hrefPath === pathname) return;

      // Only show for major routes
      if (!shouldShowLoadingBar(hrefPath)) return;

      // Store the clicked link and start loading
      clickedLinkRef.current = hrefPath;
      startLoading();
    };

    document.addEventListener("click", handleClick, { capture: true, passive: true });
    return () => document.removeEventListener("click", handleClick, { capture: true });
  }, [pathname, startLoading]);

  // Handle route changes
  useEffect(() => {
    if (lastPathRef.current !== pathname) {
      lastPathRef.current = pathname;
      
      // Only complete if we were loading due to a click
      if (stateRef.current === "loading" && clickedLinkRef.current) {
        complete();
      }
    }
  }, [pathname, complete]);

  // Safety timeout
  useEffect(() => {
    if (stateRef.current !== "loading") return;

    const timeout = setTimeout(() => {
      if (stateRef.current === "loading") {
        complete();
      }
    }, 10000);

    return () => clearTimeout(timeout);
  }, [stateRef.current === "loading", complete]);

  // Cleanup on unmount
  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] h-1 pointer-events-none">
      <div
        ref={barRef}
        className="h-full bg-primary"
        style={{
          width: "0%",
          opacity: 0,
          transition: "width 100ms linear, opacity 150ms ease-out",
          boxShadow: "0 0 10px var(--primary), 0 0 5px var(--primary)",
        }}
      />
    </div>
  );
}

// Hook for programmatic loading control
export function useLoadingBar() {
  return {
    startLoading: () => window.dispatchEvent(new CustomEvent("loadingbar:start")),
    stopLoading: () => window.dispatchEvent(new CustomEvent("loadingbar:stop")),
  };
}
