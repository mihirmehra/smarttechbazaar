"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Filter,
  User,
  Calendar,
  Package,
  ShoppingCart,
  Tag,
  Users,
  Settings,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActivityItem {
  _id: string;
  user: { _id: string; name: string; email: string; role: string };
  action: string;
  resource: string;
  resourceId?: string;
  details?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

interface Filters {
  actions: string[];
  resources: string[];
}

const actionColors: Record<string, string> = {
  create: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  update: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  delete: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  login: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  logout: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  view: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
};

const resourceIcons: Record<string, React.ReactNode> = {
  product: <Package className="h-4 w-4" />,
  order: <ShoppingCart className="h-4 w-4" />,
  category: <Tag className="h-4 w-4" />,
  user: <Users className="h-4 w-4" />,
  brand: <Tag className="h-4 w-4" />,
  ticket: <FileText className="h-4 w-4" />,
  settings: <Settings className="h-4 w-4" />,
};

export default function ActivityLogPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState<Filters>({ actions: [], resources: [] });
  const [actionFilter, setActionFilter] = useState("all");
  const [resourceFilter, setResourceFilter] = useState("all");

  useEffect(() => {
    if (session?.user?.role !== "super_admin") {
      router.push("/admin");
      return;
    }

    fetchActivities();
  }, [session, page, actionFilter, resourceFilter, router]);

  const fetchActivities = async () => {
    try {
      const params = new URLSearchParams();
      params.set("page", page.toString());
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (resourceFilter !== "all") params.set("resource", resourceFilter);

      const res = await fetch(`/api/admin/activity?${params.toString()}`);
      const data = await res.json();

      if (res.ok) {
        setActivities(data.activities);
        setTotalPages(data.totalPages);
        setFilters(data.filters);
      }
    } catch (error) {
      console.error("Error fetching activities:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Activity Log
        </h1>
        <p className="text-sm text-muted-foreground">
          Track all admin actions and system events
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All Actions</option>
              {filters.actions.map((action) => (
                <option key={action} value={action}>
                  {action.charAt(0).toUpperCase() + action.slice(1)}
                </option>
              ))}
            </select>
            <select
              value={resourceFilter}
              onChange={(e) => {
                setResourceFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm"
            >
              <option value="all">All Resources</option>
              {filters.resources.map((resource) => (
                <option key={resource} value={resource}>
                  {resource.charAt(0).toUpperCase() + resource.slice(1)}
                </option>
              ))}
            </select>
            {(actionFilter !== "all" || resourceFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setActionFilter("all");
                  setResourceFilter("all");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length > 0 ? (
            <div className="space-y-4">
              {activities.map((activity) => (
                <div
                  key={activity._id}
                  className="flex items-start gap-4 border-b pb-4 last:border-0 last:pb-0"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    {resourceIcons[activity.resource] || <Activity className="h-4 w-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {activity.user?.name || "System"}
                      </span>
                      <Badge className={actionColors[activity.action] || "bg-gray-100"}>
                        {activity.action}
                      </Badge>
                      <Badge variant="outline">
                        {activity.resource}
                      </Badge>
                    </div>
                    {activity.details && (
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                        {activity.details}
                      </p>
                    )}
                    <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(activity.createdAt).toLocaleString()}
                      </span>
                      {activity.user?.role && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activity.user.role.replace("_", " ")}
                        </span>
                      )}
                      {activity.ipAddress && (
                        <span>IP: {activity.ipAddress}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No activity logs found
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-between border-t pt-4">
              <p className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage(page + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
