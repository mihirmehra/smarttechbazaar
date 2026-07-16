"use client";

import { RefreshCw, Loader2 } from "lucide-react";
import { useAppVersion } from "@/hooks/useAppVersion";
import { useState, useEffect } from "react";

/**
 * A minimal banner that briefly shows when auto-updating.
 * The app now auto-refreshes when a new version is detected,
 * so this banner just shows the updating status.
 */
export function UpdateBanner() {
  const { updateAvailable, isRefreshing } = useAppVersion();
  const [show, setShow] = useState(false);

  // Show banner when update is detected or refreshing
  useEffect(() => {
    if (updateAvailable || isRefreshing) {
      setShow(true);
    } else {
      // Hide after a brief delay
      const timer = setTimeout(() => setShow(false), 500);
      return () => clearTimeout(timer);
    }
  }, [updateAvailable, isRefreshing]);

  if (!show) return null;

  return (
    <div className="fixed left-0 right-0 top-0 z-[100] animate-slide-down">
      <div className="mx-auto max-w-7xl px-3 py-2 md:px-4">
        <div className="flex items-center justify-center gap-3 rounded-xl bg-primary px-4 py-2.5 text-white shadow-lg">
          <div className="flex items-center gap-2.5">
            {isRefreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 animate-spin-slow" />
            )}
            <span className="text-xs font-medium md:text-sm">
              {isRefreshing ? "Updating..." : "New version detected, updating..."}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpdateBanner;
