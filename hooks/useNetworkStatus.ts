"use client";

import { useState, useEffect, useCallback } from "react";

interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
  downlink?: number;
  rtt?: number;
}

/**
 * Hook to monitor network status
 * Essential for mobile app wrappers to handle offline scenarios
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof window !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
  });

  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as Navigator & {
      connection?: {
        effectiveType?: "slow-2g" | "2g" | "3g" | "4g";
        downlink?: number;
        rtt?: number;
      };
    }).connection;

    setStatus((prev) => ({
      isOnline: navigator.onLine,
      wasOffline: prev.wasOffline || !navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    }));
  }, []);

  useEffect(() => {
    // Initial update
    updateNetworkInfo();

    // Listen for online/offline events
    const handleOnline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: true,
      }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        wasOffline: true,
      }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for connection changes
    const connection = (navigator as Navigator & {
      connection?: EventTarget;
    }).connection;

    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  return status;
}

export default useNetworkStatus;
