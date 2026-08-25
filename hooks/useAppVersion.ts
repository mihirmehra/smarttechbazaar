"use client";

import { useEffect, useCallback, useState, useRef } from "react";

const STORAGE_KEY = "stb_app_version";
const CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes (still checks on tab focus/reconnect)
const AUTO_REFRESH_DELAY = 2000; // 2 second delay before auto-refresh

/**
 * Hook to detect when a new version of the app is available.
 * Automatically refreshes the page when a new version is detected.
 * No manual user interaction required.
 */
export function useAppVersion() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasChecked = useRef(false);
  const autoRefreshTimer = useRef<NodeJS.Timeout | null>(null);

  // Get the current version from the page's meta tag
  const getCurrentVersion = useCallback((): string | null => {
    if (typeof document === "undefined") return null;
    const meta = document.querySelector('meta[name="app-version"]');
    return meta?.getAttribute("content") || null;
  }, []);

  // Perform the actual refresh
  const performRefresh = useCallback(() => {
    if (typeof window === "undefined") return;
    
    setIsRefreshing(true);
    
    const currentVersion = getCurrentVersion();
    if (currentVersion) {
      // Update stored version to current before reloading
      localStorage.setItem(STORAGE_KEY, currentVersion);
    }
    
    // Clear service worker caches
    if ("caches" in window) {
      caches.keys().then((names) => {
        Promise.all(names.map((name) => caches.delete(name)));
      });
    }
    
    // Force hard reload - use clean base URL without query params
    const baseUrl = window.location.origin + window.location.pathname;
    const cleanUrl = baseUrl.endsWith("/") && baseUrl !== window.location.origin + "/" 
      ? baseUrl.slice(0, -1) 
      : baseUrl;
    window.location.replace(cleanUrl);
  }, [getCurrentVersion]);

  // Check if there's a new version available
  const checkForUpdate = useCallback(() => {
    if (typeof window === "undefined") return;
    
    const currentVersion = getCurrentVersion();
    if (!currentVersion) return;
    
    const storedVersion = localStorage.getItem(STORAGE_KEY);
    
    // If no stored version, this is first visit - store current and don't refresh
    if (!storedVersion) {
      localStorage.setItem(STORAGE_KEY, currentVersion);
      hasChecked.current = true;
      return;
    }
    
    // Compare versions - if different, auto-refresh after a short delay
    if (storedVersion !== currentVersion) {
      setUpdateAvailable(true);
      
      // Only trigger auto-refresh if not already scheduled
      if (!autoRefreshTimer.current) {
        autoRefreshTimer.current = setTimeout(() => {
          performRefresh();
        }, AUTO_REFRESH_DELAY);
      }
    }
    
    hasChecked.current = true;
  }, [getCurrentVersion, performRefresh]);

  // Manual refresh function (for explicit user action)
  const refresh = useCallback(() => {
    // Clear any pending auto-refresh
    if (autoRefreshTimer.current) {
      clearTimeout(autoRefreshTimer.current);
      autoRefreshTimer.current = null;
    }
    performRefresh();
  }, [performRefresh]);

  // Dismiss the update (cancels auto-refresh and stores current version)
  const dismissUpdate = useCallback(() => {
    // Clear any pending auto-refresh
    if (autoRefreshTimer.current) {
      clearTimeout(autoRefreshTimer.current);
      autoRefreshTimer.current = null;
    }
    
    const currentVersion = getCurrentVersion();
    if (currentVersion) {
      localStorage.setItem(STORAGE_KEY, currentVersion);
    }
    setUpdateAvailable(false);
  }, [getCurrentVersion]);

  // Initial check on mount
  useEffect(() => {
    // Delay initial check to ensure page is fully loaded
    const timer = setTimeout(checkForUpdate, 2000);
    return () => clearTimeout(timer);
  }, [checkForUpdate]);

  // Periodic check for updates
  useEffect(() => {
    const interval = setInterval(() => {
      hasChecked.current = false;
      checkForUpdate();
    }, CHECK_INTERVAL);
    
    return () => clearInterval(interval);
  }, [checkForUpdate]);

  // Cleanup auto-refresh timer on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimer.current) {
        clearTimeout(autoRefreshTimer.current);
      }
    };
  }, []);

  // Listen for visibility changes - check for updates when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        hasChecked.current = false;
        checkForUpdate();
      }
    };
    
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [checkForUpdate]);

  // Listen for online events - check for updates when connection is restored
  useEffect(() => {
    const handleOnline = () => {
      hasChecked.current = false;
      checkForUpdate();
    };
    
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [checkForUpdate]);

  return {
    updateAvailable,
    isRefreshing,
    refresh,
    dismissUpdate,
    checkForUpdate,
  };
}

export default useAppVersion;
