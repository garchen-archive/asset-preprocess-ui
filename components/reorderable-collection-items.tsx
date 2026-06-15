"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface CollectionItemData {
  id: string;
  sequence: number;
  label: string | null;
  dayLabel: string | null;
  playlistRole: string | null;
  isContinuation: boolean;
  eventSessionId: string | null;
  sessionName: string | null;
  assetId: string | null;
  assetTitle: string | null;
}

interface ReorderableCollectionItemsProps {
  collectionId: string;
  items: CollectionItemData[];
}

export function ReorderableCollectionItems({
  collectionId,
  items: initialItems,
}: ReorderableCollectionItemsProps) {
  const [items, setItems] = useState(initialItems);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const { toast } = useToast();

  const moveItem = (index: number, direction: "up" | "down") => {
    const newItems = [...items];
    const targetIndex = direction === "up" ? index - 1 : index + 1;

    if (targetIndex < 0 || targetIndex >= newItems.length) return;

    // Swap items
    [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];

    // Update sequence numbers
    newItems.forEach((item, i) => {
      item.sequence = i + 1;
    });

    setItems(newItems);
    setHasChanges(true);
  };

  const saveOrder = async () => {
    setIsUpdating("saving");
    try {
      // Use batch reorder endpoint
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/collections/${collectionId}/items/reorder`,
          method: "POST",
          data: {
            item_ids: items.map(item => item.id),
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Failed to reorder items");
      }

      setHasChanges(false);
      toast({
        title: "Order saved",
        description: "Collection item order has been updated.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to save order",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const resetOrder = () => {
    setItems(initialItems);
    setHasChanges(false);
  };

  const removeItem = async (itemId: string) => {
    if (!confirm("Remove this item from the collection?")) return;

    setIsUpdating(itemId);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/collections/${collectionId}/items/${itemId}`,
          method: "DELETE",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Failed to remove item");
      }

      // Remove from local state
      setItems(items.filter(item => item.id !== itemId));
      toast({
        title: "Item removed",
        description: "The item has been removed from the collection.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove item",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  return (
    <div>
      {/* Save/Reset buttons when there are changes */}
      {hasChanges && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <p className="text-sm text-yellow-800">You have unsaved changes to the item order.</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetOrder}
              disabled={isUpdating !== null}
            >
              Reset
            </Button>
            <Button
              size="sm"
              onClick={saveOrder}
              disabled={isUpdating !== null}
            >
              {isUpdating === "saving" ? "Saving..." : "Save Order"}
            </Button>
          </div>
        </div>
      )}

      {items.length > 0 ? (
        <div className="rounded-lg border">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium w-20">Order</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Label</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Session/Asset</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Day</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium w-32">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((item, index) => (
                <tr key={item.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {item.sequence}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-medium">{item.label || "—"}</span>
                    {item.isContinuation && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Continuation
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {item.eventSessionId && item.sessionName && (
                      <Link
                        href={`/sessions/${item.eventSessionId}`}
                        className="text-primary hover:underline"
                      >
                        {item.sessionName}
                      </Link>
                    )}
                    {item.assetId && item.assetTitle && (
                      <Link
                        href={`/assets/${item.assetId}`}
                        className="text-primary hover:underline"
                      >
                        {item.assetTitle}
                      </Link>
                    )}
                    {!item.sessionName && !item.assetTitle && (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {item.dayLabel || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {item.playlistRole ? (
                      <Badge variant="outline" className="text-xs">
                        {item.playlistRole}
                      </Badge>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveItem(index, "up")}
                        disabled={index === 0 || isUpdating !== null}
                        title="Move up"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => moveItem(index, "down")}
                        disabled={index === items.length - 1 || isUpdating !== null}
                        title="Move down"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => removeItem(item.id)}
                        disabled={isUpdating !== null}
                        title="Remove from collection"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 border rounded-lg bg-muted/10">
          <p className="text-muted-foreground">No items in this collection</p>
        </div>
      )}
    </div>
  );
}
