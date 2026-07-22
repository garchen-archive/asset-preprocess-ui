"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Activity {
  id: string;
  activity_type: string;
  activity_category: string;
  message: string;
  triggered_by?: string;
  provider_event_type?: string;
  event_at?: string;
  created_at: string;
  old_value?: string;
  new_value?: string;
  metadata?: Record<string, any>;
}

interface AssetActivityLogProps {
  assetId: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  webhook: "bg-blue-100 text-blue-700",
  system: "bg-gray-100 text-gray-700",
  user: "bg-green-100 text-green-700",
  import: "bg-purple-100 text-purple-700",
};

const CATEGORY_OPTIONS = [
  { value: "", label: "All" },
  { value: "webhook", label: "Webhook" },
  { value: "system", label: "System" },
  { value: "user", label: "User" },
  { value: "import", label: "Import" },
];

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) {
    return "just now";
  } else if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString();
  }
}

export function AssetActivityLog({ assetId }: AssetActivityLogProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [categoryFilter, setCategoryFilter] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const fetchActivities = useCallback(async (reset = false) => {
    setIsLoading(true);
    setError(null);

    const currentOffset = reset ? 0 : offset;
    if (reset) {
      setOffset(0);
    }

    try {
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(currentOffset),
      });
      if (categoryFilter) {
        params.set("category", categoryFilter);
      }

      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}/activity?${params.toString()}`,
          method: "GET",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Failed to fetch activities");
      }

      const newActivities = result.data?.activities || [];
      setTotal(result.data?.total || 0);

      if (reset) {
        setActivities(newActivities);
      } else {
        setActivities((prev) => [...prev, ...newActivities]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch activities");
    } finally {
      setIsLoading(false);
    }
  }, [assetId, categoryFilter, offset, limit]);

  useEffect(() => {
    if (isExpanded) {
      fetchActivities(true);
    }
  }, [isExpanded, categoryFilter]);

  const handleLoadMore = () => {
    const newOffset = offset + limit;
    setOffset(newOffset);
    // Fetch with new offset
    setIsLoading(true);
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String(newOffset),
    });
    if (categoryFilter) {
      params.set("category", categoryFilter);
    }
    fetch("/api/pipeline", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        endpoint: `/api/v1/assets/${assetId}/activity?${params.toString()}`,
        method: "GET",
      }),
    })
      .then((res) => res.json())
      .then((result) => {
        const newActivities = result.data?.activities || [];
        setActivities((prev) => [...prev, ...newActivities]);
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load more");
      })
      .finally(() => {
        setIsLoading(false);
      });
  };

  const toggleItemExpanded = (id: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const hasMore = activities.length < total;

  return (
    <div className="rounded-lg border">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Activity Log</h2>
          {total > 0 && (
            <Badge variant="secondary" className="text-xs">
              {total}
            </Badge>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t">
          {/* Filter Bar */}
          <div className="px-4 py-2 bg-muted/20 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Category:</label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="text-xs rounded border border-input bg-background px-2 py-1"
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            {total > 0 && (
              <span className="text-xs text-muted-foreground">
                {activities.length}/{total}
              </span>
            )}
          </div>

          {/* Table */}
          {isLoading && activities.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              Loading...
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button size="sm" variant="outline" className="mt-2" onClick={() => fetchActivities(true)}>
                Retry
              </Button>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No activity recorded.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-20">Time</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-16">Cat.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Message</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-24">By</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {activities.map((activity) => (
                    <>
                      <tr key={activity.id} className="hover:bg-muted/20">
                        <td
                          className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap"
                          title={new Date(activity.event_at || activity.created_at).toLocaleString()}
                        >
                          {formatRelativeTime(activity.event_at || activity.created_at)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                              CATEGORY_COLORS[activity.activity_category] || CATEGORY_COLORS.system
                            }`}
                          >
                            {activity.activity_category.slice(0, 4)}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-xs whitespace-nowrap">
                          {activity.activity_type}
                        </td>
                        <td className="px-3 py-2 text-xs max-w-xs truncate" title={activity.message}>
                          {activity.message}
                          {(activity.old_value || activity.new_value) && (
                            <span className="ml-2 text-muted-foreground">
                              (<span className="line-through">{activity.old_value}</span> → {activity.new_value})
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground truncate" title={activity.triggered_by}>
                          {activity.triggered_by || "—"}
                        </td>
                        <td className="px-3 py-2">
                          {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                            <button
                              onClick={() => toggleItemExpanded(activity.id)}
                              className="text-muted-foreground hover:text-foreground"
                              title="Toggle details"
                            >
                              <svg
                                className={`w-4 h-4 transition-transform ${expandedItems.has(activity.id) ? "rotate-180" : ""}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                      {expandedItems.has(activity.id) && activity.metadata && (
                        <tr key={`${activity.id}-meta`}>
                          <td colSpan={6} className="px-3 py-2 bg-muted/30">
                            <pre className="text-xs overflow-x-auto font-mono whitespace-pre-wrap">
                              {JSON.stringify(activity.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Load More */}
          {hasMore && (
            <div className="px-4 py-2 border-t text-center">
              <Button size="sm" variant="ghost" onClick={handleLoadMore} disabled={isLoading}>
                {isLoading ? "Loading..." : `Load more (${total - activities.length} remaining)`}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
