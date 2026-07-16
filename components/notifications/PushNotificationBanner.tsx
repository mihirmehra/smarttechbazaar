"use client";

import { useState, useEffect } from "react";
import { Bell, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNativeApp } from "@/components/providers/NativeAppProvider";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationBanner() {
  const { isNativeApp, isReady } = useNativeApp();
  const { isSupported, isEnabled, isLoading, requestPermission, registerDevice, recheckStatus } = usePushNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Check if banner was previously dismissed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = localStorage.getItem("push_banner_dismissed");
      if (wasDismissed) {
        setDismissed(true);
      }
    }
  }, []);

  // Don't show if:
  // - Not ready yet
  // - Not supported
  // - Already enabled
  // - User dismissed
  // - Still loading
  if (!isReady || !isSupported || isEnabled || dismissed || isLoading) {
    return null;
  }

  const handleEnable = async () => {
    setRequesting(true);
    setStatus("idle");
    setErrorMessage(null);
    
    try {
      const granted = await requestPermission();
      
      if (granted) {
        // Try to register device
        await registerDevice();
        setStatus("success");
        
        // Recheck status after a moment to confirm
        setTimeout(() => {
          recheckStatus();
        }, 2000);
      } else {
        // Permission was not granted - could be denied or the subscription failed
        setStatus("error");
        setErrorMessage(
          "Could not enable notifications. Please check that notifications are enabled in your device settings, then try again."
        );
      }
    } catch (error) {
      console.error("Error enabling push notifications:", error);
      setStatus("error");
      setErrorMessage(
        "Something went wrong. Please make sure notifications are enabled in your device settings."
      );
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem("push_banner_dismissed", "true");
  };

  // Show success message
  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-green-800">Notifications Enabled!</h3>
            <p className="text-xs text-green-600 mt-0.5">
              {"You'll"} receive updates about your orders and deals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-4 animate-fade-in">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <Bell className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-foreground">
            {isNativeApp ? "Enable Push Notifications" : "Stay Updated"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Get instant updates about your orders, exclusive deals, and important announcements.
          </p>
          
          {/* Error message */}
          {status === "error" && errorMessage && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-600">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 mt-3">
            <Button
              size="sm"
              onClick={handleEnable}
              disabled={requesting}
              className="h-8 text-xs gap-1.5"
            >
              {requesting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <Bell className="h-3.5 w-3.5" />
                  Enable Notifications
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="h-8 text-xs text-muted-foreground"
            >
              Not now
            </Button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground p-1 -m-1"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default PushNotificationBanner;
