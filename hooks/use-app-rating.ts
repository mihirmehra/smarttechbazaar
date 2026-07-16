"use client";

import { useCallback, useEffect, useState } from "react";
import { isMedianApp, getPlatform } from "@/lib/native-app";

interface UseAppRatingReturn {
  canShowRating: boolean;
  showRatingPrompt: () => Promise<void>;
  dismissRating: () => void;
  hasRated: boolean;
}

const RATING_STORAGE_KEY = "app_rating_status";
const MIN_SESSIONS_FOR_RATING = 3;
const MIN_DAYS_BETWEEN_PROMPTS = 7;

interface RatingStatus {
  hasRated: boolean;
  dismissedAt: string | null;
  sessionCount: number;
  lastPromptedAt: string | null;
}

export function useAppRating(): UseAppRatingReturn {
  const [canShowRating, setCanShowRating] = useState(false);
  const [hasRated, setHasRated] = useState(false);

  useEffect(() => {
    // Only show rating in native app
    if (!isMedianApp()) {
      return;
    }

    // Get stored rating status
    const storedStatus = localStorage.getItem(RATING_STORAGE_KEY);
    let status: RatingStatus = {
      hasRated: false,
      dismissedAt: null,
      sessionCount: 0,
      lastPromptedAt: null,
    };

    if (storedStatus) {
      try {
        status = JSON.parse(storedStatus);
      } catch {
        // Invalid stored data, reset
      }
    }

    // Increment session count
    status.sessionCount++;
    localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(status));

    setHasRated(status.hasRated);

    // Don't show if already rated
    if (status.hasRated) {
      return;
    }

    // Check if enough sessions have passed
    if (status.sessionCount < MIN_SESSIONS_FOR_RATING) {
      return;
    }

    // Check if enough time has passed since last dismiss
    if (status.dismissedAt) {
      const daysSinceDismiss = Math.floor(
        (Date.now() - new Date(status.dismissedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceDismiss < MIN_DAYS_BETWEEN_PROMPTS) {
        return;
      }
    }

    // Check if enough time has passed since last prompt
    if (status.lastPromptedAt) {
      const daysSincePrompt = Math.floor(
        (Date.now() - new Date(status.lastPromptedAt).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSincePrompt < MIN_DAYS_BETWEEN_PROMPTS) {
        return;
      }
    }

    setCanShowRating(true);
  }, []);

  const showRatingPrompt = useCallback(async () => {
    if (!isMedianApp()) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const median = (window as any).median;

      // Use Median.co's native rating prompt
      if (median?.appReview?.requestReview) {
        await median.appReview.requestReview();

        // Mark as rated
        const storedStatus = localStorage.getItem(RATING_STORAGE_KEY);
        const status: RatingStatus = storedStatus ? JSON.parse(storedStatus) : {
          hasRated: false,
          dismissedAt: null,
          sessionCount: 0,
          lastPromptedAt: null,
        };

        status.hasRated = true;
        status.lastPromptedAt = new Date().toISOString();
        localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(status));

        setHasRated(true);
        setCanShowRating(false);
      } else {
        // Fallback: Open store page
        const platform = getPlatform();
        if (platform === "ios") {
          window.open("https://apps.apple.com/app/id6766469443", "_blank");
        } else if (platform === "android") {
          window.open("https://play.google.com/store/apps/details?id=com.smarttechbazaar.app", "_blank");
        }

        // Update status
        const storedStatus = localStorage.getItem(RATING_STORAGE_KEY);
        const status: RatingStatus = storedStatus ? JSON.parse(storedStatus) : {
          hasRated: false,
          dismissedAt: null,
          sessionCount: 0,
          lastPromptedAt: null,
        };

        status.lastPromptedAt = new Date().toISOString();
        localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(status));
      }
    } catch (error) {
      console.error("Failed to show rating prompt:", error);
    }
  }, []);

  const dismissRating = useCallback(() => {
    const storedStatus = localStorage.getItem(RATING_STORAGE_KEY);
    const status: RatingStatus = storedStatus ? JSON.parse(storedStatus) : {
      hasRated: false,
      dismissedAt: null,
      sessionCount: 0,
      lastPromptedAt: null,
    };

    status.dismissedAt = new Date().toISOString();
    localStorage.setItem(RATING_STORAGE_KEY, JSON.stringify(status));

    setCanShowRating(false);
  }, []);

  return {
    canShowRating,
    showRatingPrompt,
    dismissRating,
    hasRated,
  };
}

export default useAppRating;
