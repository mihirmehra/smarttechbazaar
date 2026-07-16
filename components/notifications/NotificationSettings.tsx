"use client";

import { useState, useEffect } from "react";
import {
  Bell,
  BellOff,
  Package,
  Tag,
  MessageSquare,
  Megaphone,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNativeApp } from "@/components/providers/NativeAppProvider";
import { usePushNotifications } from "@/hooks/use-push-notifications";

interface NotificationPreferences {
  orderUpdates: boolean;
  promotions: boolean;
  priceDrops: boolean;
  supportMessages: boolean;
  announcements: boolean;
}

export function NotificationSettings() {
  const { isNativeApp, platform, isReady } = useNativeApp();
  const { isSupported, isEnabled, requestPermission, registerDevice, recheckStatus } = usePushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    orderUpdates: true,
    promotions: true,
    priceDrops: true,
    supportMessages: true,
    announcements: true,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [success, setSuccess] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"success" | "error" | null>(null);

  // Fetch preferences on mount
  useEffect(() => {
    const fetchPreferences = async () => {
      try {
        const res = await fetch("/api/user/notifications?preferences=true");
        const data = await res.json();
        if (res.ok && data.preferences) {
          setPreferences(data.preferences);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPreferences();
  }, []);

  const handleToggle = async (key: keyof NotificationPreferences) => {
    const newValue = !preferences[key];
    setPreferences((prev) => ({ ...prev, [key]: newValue }));
    setSaving(true);

    try {
      await fetch("/api/user/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: { [key]: newValue } }),
      });
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch (error) {
      // Revert on error
      setPreferences((prev) => ({ ...prev, [key]: !newValue }));
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifications = async () => {
    console.log("[v0] NotificationSettings: handleEnableNotifications clicked");
    setEnabling(true);
    try {
      const granted = await requestPermission();
      console.log("[v0] Permission granted:", granted);
      if (granted) {
        const token = await registerDevice();
        console.log("[v0] Device registered, token:", token);
        // Recheck status after a moment
        setTimeout(() => {
          recheckStatus();
        }, 1500);
      }
    } catch (error) {
      console.error("[v0] Enable notifications error:", error);
    } finally {
      setEnabling(false);
    }
  };

  const handleTestNotification = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/user/notifications/test", {
        method: "POST",
      });
      if (res.ok) {
        setTestResult("success");
        // Also try to show a local notification as fallback
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Test Notification", {
            body: "Push notifications are working correctly!",
            icon: "/icons/icon-192x192.png",
          });
        }
      } else {
        setTestResult("error");
      }
    } catch (error) {
      console.error("Test notification failed:", error);
      setTestResult("error");
      // Try local notification anyway
      if (typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Test Notification", {
          body: "Push notifications are working correctly!",
          icon: "/icons/icon-192x192.png",
        });
        setTestResult("success");
      }
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const settingsConfig = [
    {
      key: "orderUpdates" as const,
      label: "Order Updates",
      description: "Shipping status, delivery confirmations",
      icon: Package,
    },
    {
      key: "promotions" as const,
      label: "Promotions & Offers",
      description: "Exclusive deals and discounts",
      icon: Tag,
    },
    {
      key: "priceDrops" as const,
      label: "Price Drop Alerts",
      description: "When wishlist items go on sale",
      icon: Tag,
    },
    {
      key: "supportMessages" as const,
      label: "Support Messages",
      description: "Replies to your support tickets",
      icon: MessageSquare,
    },
    {
      key: "announcements" as const,
      label: "Announcements",
      description: "New features and important updates",
      icon: Megaphone,
    },
  ];

  if (!isReady || loading) {
    return (
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <div className="h-6 w-40 bg-muted animate-pulse rounded" />
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-14 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Push Notification Status */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                isEnabled
                  ? "bg-green-100 text-green-600"
                  : "bg-amber-100 text-amber-600"
              }`}
            >
              {isEnabled ? (
                <Bell className="h-5 w-5" />
              ) : (
                <BellOff className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="font-semibold text-foreground text-sm">
                Push Notifications
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isEnabled
                  ? "Push notifications are enabled"
                  : isSupported
                  ? "Enable to get instant updates"
                  : "Not available on this device"}
              </p>
              {isEnabled && isNativeApp && (
                <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                  <Smartphone className="h-3.5 w-3.5" />
                  <span>
                    Connected via {platform === "ios" ? "iOS" : platform === "android" ? "Android" : "Web"} app
                  </span>
                </div>
              )}
            </div>
          </div>
          {!isEnabled && isSupported && (
            <Button
              size="sm"
              onClick={handleEnableNotifications}
              disabled={enabling}
              className="h-8 text-xs gap-1.5 shrink-0"
            >
              {enabling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bell className="h-3.5 w-3.5" />
              )}
              Enable
            </Button>
          )}
          {isEnabled && (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleTestNotification}
                disabled={testing}
                className="h-8 text-xs gap-1.5"
              >
                {testing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : testResult === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                ) : testResult === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" />
                ) : (
                  <Bell className="h-3.5 w-3.5" />
                )}
                {testing ? "Sending..." : testResult === "success" ? "Sent!" : testResult === "error" ? "Failed" : "Test"}
              </Button>
              <div className="flex items-center gap-1.5 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Active</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="bg-card rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground text-sm">Notification Preferences</h3>
          {saving && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </div>
          )}
          {success && !saving && (
            <div className="flex items-center gap-1.5 text-xs text-green-600">
              <CheckCircle2 className="h-3 w-3" />
              Saved
            </div>
          )}
        </div>

        {!isEnabled && isSupported && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Enable push notifications above to receive these alerts on your device.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-1">
          {settingsConfig.map((setting) => (
            <label
              key={setting.key}
              className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-3">
                <setting.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{setting.label}</p>
                  <p className="text-xs text-muted-foreground">{setting.description}</p>
                </div>
              </div>
              <div className="relative">
                <input
                  type="checkbox"
                  checked={preferences[setting.key]}
                  onChange={() => handleToggle(setting.key)}
                  className="sr-only peer"
                />
                <div className="h-6 w-11 rounded-full bg-muted peer-checked:bg-primary transition-colors" />
                <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-5" />
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Info about email notifications */}
      <div className="bg-muted/50 rounded-xl p-4">
        <p className="text-xs text-muted-foreground">
          You will also receive important notifications via email at your registered email address.
          These cannot be disabled for security and order-related communications.
        </p>
      </div>
    </div>
  );
}

export default NotificationSettings;
