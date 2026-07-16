"use client";

import { useState, useEffect } from "react";
import { Star, X, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppRating } from "@/hooks/use-app-rating";
import { useNativeApp } from "@/components/providers/NativeAppProvider";

export function AppRatingDialog() {
  const { isNativeApp, isReady } = useNativeApp();
  const { canShowRating, showRatingPrompt, dismissRating } = useAppRating();
  const [isVisible, setIsVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Only show after a delay and when in native app
    if (isReady && isNativeApp && canShowRating) {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 5000); // Show after 5 seconds of page load
      return () => clearTimeout(timer);
    }
  }, [isReady, isNativeApp, canShowRating]);

  const handleRate = async () => {
    setIsSubmitting(true);
    await showRatingPrompt();
    setIsVisible(false);
    setIsSubmitting(false);
  };

  const handleDismiss = () => {
    dismissRating();
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleDismiss}
      />
      
      {/* Dialog */}
      <div className="relative w-full max-w-sm animate-in slide-in-from-bottom-4 duration-300 bg-card rounded-2xl border border-border shadow-xl overflow-hidden">
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-6 text-center">
          {/* Icon */}
          <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Heart className="h-8 w-8 text-primary fill-primary" />
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-foreground mb-2">
            Enjoying Smart Tech Bazaar?
          </h2>

          {/* Description */}
          <p className="text-sm text-muted-foreground mb-6">
            Your feedback helps us improve! Take a moment to rate us on the app store.
          </p>

          {/* Stars preview */}
          <div className="flex items-center justify-center gap-1 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star 
                key={star} 
                className="h-7 w-7 text-amber-400 fill-amber-400" 
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button
              onClick={handleRate}
              disabled={isSubmitting}
              className="w-full"
            >
              {isSubmitting ? "Opening..." : "Rate Now"}
            </Button>
            <Button
              variant="ghost"
              onClick={handleDismiss}
              className="w-full text-muted-foreground"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AppRatingDialog;
