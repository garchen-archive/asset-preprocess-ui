"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AsyncSearchableSelect } from "@/components/async-searchable-select";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { getPublicationStatusColor } from "@/lib/status-types";

// Icon for event/session types
function ContentTypeIcon({ type }: { type: "event" | "session" }) {
  if (type === "event") {
    return (
      <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  // Session icon
  return (
    <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

interface RelatedContentItem {
  id: string;
  relatedType: "event" | "session";
  relatedId: string;
  relatedEventName?: string | null;
  relatedEventDateStart?: string | null;
  relatedEventPublicationStatus?: string | null;
  relatedSessionName?: string | null;
  relatedSessionDate?: string | null;
  relatedSessionEventName?: string | null;
  relatedSessionPublicationStatus?: string | null;
  sequence: number;
  label: string | null;
  thumbnailUrl?: string | null;
}

interface RelatedContentSectionProps {
  ownerType: "event" | "session";
  ownerId: string;
  ownerName: string;
  items: RelatedContentItem[];
  excludeEventId?: string; // Exclude self-reference for events
}

const MAX_ITEMS = 6;

export function RelatedContentSection({
  ownerType,
  ownerId,
  ownerName,
  items,
  excludeEventId,
}: RelatedContentSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [relatedType, setRelatedType] = useState<"event" | "session">("event");
  const [relatedId, setRelatedId] = useState("");
  const [relatedLabel, setRelatedLabel] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const sortedItems = [...items].sort((a, b) => a.sequence - b.sequence);
  const isAtLimit = items.length >= MAX_ITEMS;

  // Build API endpoint based on owner type
  const baseEndpoint = ownerType === "event"
    ? `/api/v1/admin/events/${ownerId}/related-content`
    : `/api/v1/admin/sessions/${ownerId}/related-content`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!relatedId) {
      toast({
        title: "Error",
        description: `Please select ${relatedType === "event" ? "an event" : "a session"}`,
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: baseEndpoint,
          method: "POST",
          data: {
            related_type: relatedType,
            related_id: relatedId,
            label: customLabel || undefined,
            sequence: sortedItems.length,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        if (result.status === 409) {
          throw new Error("This item is already linked");
        }
        if (result.status === 400 && result.data?.error?.includes("6")) {
          throw new Error("Maximum of 6 related items allowed");
        }
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Content linked",
        description: `${relatedLabel || "Item"} has been added as related content.`,
      });

      resetForm();
      setIsFormOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to link content",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setRelatedType("event");
    setRelatedId("");
    setRelatedLabel("");
    setCustomLabel("");
  };

  const handleMove = async (itemId: string, direction: "up" | "down") => {
    const currentIndex = sortedItems.findIndex((i) => i.id === itemId);
    if (currentIndex === -1) return;
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sortedItems.length - 1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentItem = sortedItems[currentIndex];
    const swapItem = sortedItems[swapIndex];

    // Use array indices for sequences to ensure they're always unique
    const currentNewSeq = swapIndex;
    const swapNewSeq = currentIndex;

    try {
      const [res1, res2] = await Promise.all([
        fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/api/v1/admin/related-content/${currentItem.id}`,
            method: "PATCH",
            data: { sequence: currentNewSeq },
          }),
        }),
        fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/api/v1/admin/related-content/${swapItem.id}`,
            method: "PATCH",
            data: { sequence: swapNewSeq },
          }),
        }),
      ]);

      const result1 = await res1.json();
      const result2 = await res2.json();

      if (!res1.ok || result1.status >= 400 || !res2.ok || result2.status >= 400) {
        throw new Error("Failed to update order");
      }

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to reorder",
        variant: "destructive",
      });
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!confirm("Remove this related content?")) return;

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/related-content/${itemId}`,
          method: "DELETE",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Content removed",
        description: "Related content has been removed.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove content",
        variant: "destructive",
      });
    }
  };

  const handleLabelChange = async (itemId: string, newLabel: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/related-content/${itemId}`,
          method: "PATCH",
          data: {
            label: newLabel || null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Label updated",
        description: "Related content label has been updated.",
      });

      setEditingLabelId(null);
      setEditingLabelValue("");
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update label",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getItemDisplay = (item: RelatedContentItem) => {
    if (item.relatedType === "event") {
      return {
        name: item.relatedEventName || "Unknown Event",
        subtitle: item.relatedEventDateStart || null,
        href: `/events/${item.relatedId}`,
        publicationStatus: item.relatedEventPublicationStatus || "draft",
      };
    } else {
      return {
        name: item.relatedSessionName || "Unknown Session",
        subtitle: item.relatedSessionEventName
          ? `from ${item.relatedSessionEventName}`
          : item.relatedSessionDate || null,
        href: `/sessions/${item.relatedId}`,
        publicationStatus: item.relatedSessionPublicationStatus || "draft",
      };
    }
  };

  return (
    <div className="rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          Related Content ({items.length}/{MAX_ITEMS})
        </h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFormOpen(!isFormOpen)}
          disabled={isAtLimit && !isFormOpen}
        >
          {isFormOpen ? "Cancel" : isAtLimit ? "At Limit" : "Add Related Content"}
        </Button>
      </div>

      {/* Add Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-3 bg-muted/30 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Type Toggle */}
            <div className="w-28">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <select
                value={relatedType}
                onChange={(e) => {
                  setRelatedType(e.target.value as "event" | "session");
                  setRelatedId("");
                  setRelatedLabel("");
                }}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="event">Event</option>
                <option value="session">Session</option>
              </select>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                {relatedType === "event" ? "Event" : "Session"}
              </label>
              {relatedType === "event" ? (
                <AsyncSearchableSelect
                  searchEndpoint={`/api/search/events?${excludeEventId ? `exclude=${excludeEventId}&` : ""}`}
                  placeholder="Search events..."
                  value={relatedId}
                  onChange={(value, labelText) => {
                    setRelatedId(value);
                    setRelatedLabel(labelText || "");
                  }}
                  transformResult={(item) => ({
                    value: item.id,
                    label: `${item.eventName}${item.eventDateStart ? ` (${item.eventDateStart})` : ""}`,
                  })}
                />
              ) : (
                <AsyncSearchableSelect
                  searchEndpoint="/api/search/sessions?"
                  placeholder="Search sessions..."
                  value={relatedId}
                  onChange={(value, labelText) => {
                    setRelatedId(value);
                    setRelatedLabel(labelText || "");
                  }}
                  transformResult={(item) => ({
                    value: item.id,
                    label: `${item.sessionName}${item.eventName ? ` (${item.eventName})` : ""}`,
                  })}
                />
              )}
            </div>

            {/* Label */}
            <div className="w-40">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Label</label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="Optional"
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              />
            </div>

            {/* Submit */}
            <Button type="submit" size="sm" disabled={isSubmitting || !relatedId} className="h-10">
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </div>
        </form>
      )}

      {/* Items List */}
      {sortedItems.length > 0 ? (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-2 py-3 text-left text-sm font-medium w-12">#</th>
                <th className="px-2 py-3 text-left text-sm font-medium w-20"></th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium w-24">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Label</th>
                <th className="px-4 py-3 text-left text-sm font-medium w-20">Order</th>
                <th className="px-4 py-3 text-left text-sm font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, index) => {
                const display = getItemDisplay(item);
                return (
                  <tr key={item.id} className="border-b hover:bg-muted/50">
                    <td className="px-2 py-3 text-sm text-center text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex flex-col items-center gap-1">
                        {item.thumbnailUrl ? (
                          <img
                            src={item.thumbnailUrl}
                            alt=""
                            className="w-14 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-14 h-10 bg-muted rounded flex items-center justify-center">
                            <ContentTypeIcon type={item.relatedType} />
                          </div>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {item.relatedType === "event" ? "Event" : "Session"}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <Link
                        href={display.href}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {display.name}
                      </Link>
                      {display.subtitle && (
                        <span className="text-xs text-muted-foreground ml-2">
                          {display.subtitle}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getPublicationStatusColor(display.publicationStatus)}`}>
                        {display.publicationStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {editingLabelId === item.id ? (
                        <input
                          type="text"
                          value={editingLabelValue}
                          onChange={(e) => setEditingLabelValue(e.target.value)}
                          onBlur={() => {
                            if (!isUpdating) {
                              if (editingLabelValue !== (item.label || "")) {
                                handleLabelChange(item.id, editingLabelValue);
                              } else {
                                setEditingLabelId(null);
                                setEditingLabelValue("");
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleLabelChange(item.id, editingLabelValue);
                            } else if (e.key === "Escape") {
                              setEditingLabelId(null);
                              setEditingLabelValue("");
                            }
                          }}
                          disabled={isUpdating}
                          autoFocus
                          placeholder="Enter label..."
                          className="text-xs border rounded px-2 py-1 bg-background w-28"
                        />
                      ) : (
                        <button
                          onClick={() => {
                            setEditingLabelId(item.id);
                            setEditingLabelValue(item.label || "");
                          }}
                          className="hover:bg-muted rounded px-1 py-0.5 transition-colors text-muted-foreground"
                          title="Click to edit label"
                        >
                          {item.label || "—"}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMove(item.id, "up")}
                          disabled={index === 0}
                          className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move up"
                        >
                          ↑
                        </button>
                        <button
                          onClick={() => handleMove(item.id, "down")}
                          disabled={index === sortedItems.length - 1}
                          className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title="Move down"
                        >
                          ↓
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-red-600 hover:underline text-xs"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No related content yet. Link related events or sessions to help users discover more.
        </p>
      )}
    </div>
  );
}
