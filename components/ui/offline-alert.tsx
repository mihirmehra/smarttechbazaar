"use client";

import { WifiOff, RefreshCw } from "lucide-react";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Button } from "@/components/ui/button";

interface OfflineAlertProps {
  className?: string;
  onRetry?: () => void;
}

/**
 * Offline Alert Component
 * Shows a banner when the device is offline
 * Essential for mobile app wrappers
 */
export function OfflineAlert({ className = "", onRetry }: OfflineAlertProps) {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Don't show if online and never went offline
  if (isOnline && !wasOffline) {
    return null;
  }

  // Show reconnected message briefly
  if (isOnline && wasOffline) {
    return (
      <div
        className={`fixed top-0 left-0 right-0 z-50 bg-green-600 text-white px-4 py-2 text-center text-sm font-medium animate-slide-down ${className}`}
        style={{ paddingTop: "max(env(safe-area-inset-top), 8px)" }}
      >
        Back online! Refreshing data...
      </div>
    );
  }

  // Show offline message
  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 ${className}`}
      style={{ paddingTop: "max(env(safe-area-inset-top), 12px)" }}
    >
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">You&apos;re offline. Some features may not work.</span>
        </div>
        {onRetry && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRetry}
            className="shrink-0 text-white hover:bg-white/20 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

export default OfflineAlert;
