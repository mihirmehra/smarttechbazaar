"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bell,
  Package,
  LifeBuoy,
  CreditCard,
  User,
  Settings,
  CheckCheck,
  Trash2,
  Loader2,
  ChevronRight,
  Sliders,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PushNotificationBanner } from "@/components/notifications/PushNotificationBanner";
import { NotificationSettings } from "@/components/notifications/NotificationSettings";

interface Notification {
  _id: string;
  type: "order" | "ticket" | "inventory" | "user" | "system" | "payment";
  title: string;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

const typeIcons: Record<Notification["type"], typeof Bell> = {
  order: Package,
  ticket: LifeBuoy,
  inventory: Package,
  user: User,
  system: Settings,
  payment: CreditCard,
};

const typeColors: Record<Notification["type"], string> = {
  order: "bg-blue-100 text-blue-600",
  ticket: "bg-purple-100 text-purple-600",
  inventory: "bg-yellow-100 text-yellow-600",
  user: "bg-green-100 text-green-600",
  system: "bg-gray-100 text-gray-600",
  payment: "bg-emerald-100 text-emerald-600",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [activeTab, setActiveTab] = useState<"notifications" | "settings">("notifications");

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/user/notifications");
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    await fetch("/api/user/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notificationIds: [id] }),
    });
  };

  const markAllAsRead = async () => {
    setMarkingAll(true);
    try {
      const res = await fetch("/api/user/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } finally {
      setMarkingAll(false);
    }
  };

  const clearReadNotifications = async () => {
    setClearing(true);
    try {
      const res = await fetch("/api/user/notifications?read=true", {
        method: "DELETE",
      });
      if (res.ok) {
        setNotifications((prev) => prev.filter((n) => !n.isRead));
      }
    } finally {
      setClearing(false);
    }
  };

  const formatDate = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours === 0) {
        const minutes = Math.floor(diff / (1000 * 60));
        return minutes <= 1 ? "Just now" : `${minutes} minutes ago`;
      }
      return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
    }
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="bg-card rounded-xl border border-border p-4 h-20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Push Notification Banner - shows when notifications not enabled */}
      <PushNotificationBanner />

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-muted rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === "notifications"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" />
            Notifications
            {unreadCount > 0 && (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("settings")}
          className={`px-4 py-2 text-xs font-medium rounded-md transition-colors ${
            activeTab === "settings"
              ? "bg-white text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="h-3.5 w-3.5" />
            Settings
          </span>
        </button>
      </div>

      {/* Settings Tab */}
      {activeTab === "settings" && <NotificationSettings />}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
              {unreadCount}
            </span>
          )}
          <p className="text-xs text-muted-foreground">
            {unreadCount > 0 ? "unread" : "All caught up!"}
          </p>
        </div>
        {notifications.length > 0 && (
          <div className="flex items-center gap-1.5">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={markAllAsRead}
                disabled={markingAll}
                className="gap-1.5 h-8 text-xs"
              >
                {markingAll ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <CheckCheck className="h-3 w-3" />
                )}
                Mark all read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearReadNotifications}
              disabled={clearing || !notifications.some((n) => n.isRead)}
              className="gap-1.5 h-8 text-xs text-muted-foreground hover:text-destructive"
            >
              {clearing ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              Clear
            </Button>
          </div>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <div className="bg-card rounded-xl border border-border flex flex-col items-center justify-center py-16 text-center">
          <Bell className="h-12 w-12 text-muted-foreground/30 mb-4" />
          <p className="text-base font-semibold text-foreground">No notifications</p>
          <p className="text-sm text-muted-foreground mt-1">
            {"You're all caught up!"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notification) => {
            const Icon = typeIcons[notification.type] || Bell;
            const colorClass = typeColors[notification.type] || "bg-gray-100 text-gray-600";

            const handleClick = () => {
              if (!notification.isRead) {
                markAsRead(notification._id);
              }
            };

            const content = (
              <>
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground">
                      {notification.title}
                    </p>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {formatDate(notification.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notification.message}
                  </p>
                </div>
                {notification.link && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                )}
                {!notification.isRead && (
                  <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                )}
              </>
            );

            const baseClassName = `bg-card rounded-2xl border transition-all flex items-start gap-3 px-4 py-3.5 press-active ${
              notification.isRead
                ? "border-border"
                : "border-primary/30 bg-primary/5"
            }`;

            if (notification.link) {
              return (
                <Link
                  key={notification._id}
                  href={notification.link}
                  onClick={handleClick}
                  className={`${baseClassName} cursor-pointer hover:shadow-md hover:border-primary/50`}
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={notification._id}
                onClick={handleClick}
                className={baseClassName}
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
        </>
      )}
    </div>
  );
}
