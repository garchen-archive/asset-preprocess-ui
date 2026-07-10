"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AsyncSearchableSelect } from "@/components/async-searchable-select";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { RELATED_ASSET_TYPE_OPTIONS, getRelatedAssetTypeLabel } from "@/lib/related-asset-types";
import { getPublicationStatusColor, getProcessingStatusColor } from "@/lib/status-types";

// Icon components for asset types
function AssetTypeIcon({ assetType, fileFormat }: { assetType: string | null; fileFormat: string | null }) {
  const type = assetType?.toLowerCase() || fileFormat?.toLowerCase() || "";

  if (type.includes("video")) {
    return (
      <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  }
  if (type.includes("audio")) {
    return (
      <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
      </svg>
    );
  }
  if (type.includes("pdf") || type.includes("document")) {
    return (
      <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  }
  if (type.includes("subtitle") || type.includes("vtt") || type.includes("srt")) {
    return (
      <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    );
  }
  if (type.includes("image") || type.includes("png") || type.includes("jpg") || type.includes("jpeg")) {
    return (
      <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
  }
  // Default file icon
  return (
    <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  );
}

interface RelatedAssetLink {
  id: string; // related_asset.id
  assetId: string;
  title: string | null;
  name: string | null;
  assetType: string | null;
  fileFormat: string | null;
  publicationStatus: string | null;
  processingStatus: string | null;
  thumbnailUrl: string | null;
  hasCdnDelivery: boolean; // Whether asset is synced to CDN (Backblaze or Mux)
  relatedType: string | null;
  label: string | null;
  sequence: number | null;
}

interface RelatedAssetsSectionProps {
  ownerType: "event" | "event_session";
  ownerId: string;
  ownerName: string;
  assets: RelatedAssetLink[];
}

const MAX_ITEMS = 6;

export function RelatedAssetsSection({
  ownerType,
  ownerId,
  ownerName,
  assets,
}: RelatedAssetsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [assetLabel, setAssetLabel] = useState("");
  const [relatedType, setRelatedType] = useState("document");
  const [label, setLabel] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingLabelValue, setEditingLabelValue] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Sort assets by sequence
  const sortedAssets = [...assets].sort((a, b) => {
    const seqA = a.sequence ?? 999;
    const seqB = b.sequence ?? 999;
    return seqA - seqB;
  });

  const isAtLimit = assets.length >= MAX_ITEMS;

  // CDN sync stats
  const cdnSyncedCount = assets.filter(a => a.hasCdnDelivery).length;
  const allSyncedToCdn = assets.length > 0 && cdnSyncedCount === assets.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isAtLimit) {
      toast({
        title: "Limit reached",
        description: `Maximum of ${MAX_ITEMS} associated media items allowed per event`,
        variant: "destructive",
      });
      return;
    }

    if (!assetId) {
      toast({
        title: "Error",
        description: "Please select an asset",
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
          endpoint: "/api/v1/admin/related-assets",
          method: "POST",
          data: {
            owner_type: ownerType,
            owner_id: ownerId,
            asset_id: assetId,
            related_type: relatedType,
            label: label || undefined,
            sequence: sortedAssets.length, // Add at the end
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        if (result.status === 409) {
          throw new Error("This asset is already attached");
        }
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Asset attached",
        description: `${assetLabel || "Asset"} has been added as associated media.`,
      });

      resetForm();
      setIsFormOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to attach asset",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setAssetId("");
    setAssetLabel("");
    setRelatedType("document");
    setLabel("");
  };

  const handleLabelChange = async (relatedAssetId: string, newLabel: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/related-assets/${relatedAssetId}`,
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
        description: "Associated media label has been updated.",
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

  const handleRelatedTypeChange = async (relatedAssetId: string, newRelatedType: string) => {
    setIsUpdating(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/related-assets/${relatedAssetId}`,
          method: "PATCH",
          data: {
            related_type: newRelatedType,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Type updated",
        description: "Associated media type has been updated.",
      });

      setEditingId(null);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update type",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMove = async (relatedAssetId: string, direction: "up" | "down") => {
    const currentIndex = sortedAssets.findIndex((a) => a.id === relatedAssetId);
    if (currentIndex === -1) return;
    if (direction === "up" && currentIndex === 0) return;
    if (direction === "down" && currentIndex === sortedAssets.length - 1) return;

    const swapIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    const currentAsset = sortedAssets[currentIndex];
    const swapAsset = sortedAssets[swapIndex];

    // Use array indices for sequences to ensure they're always unique
    const currentNewSeq = swapIndex;
    const swapNewSeq = currentIndex;

    try {
      // Update both assets' sequences
      const [res1, res2] = await Promise.all([
        fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/api/v1/admin/related-assets/${currentAsset.id}`,
            method: "PATCH",
            data: { sequence: currentNewSeq },
          }),
        }),
        fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/api/v1/admin/related-assets/${swapAsset.id}`,
            method: "PATCH",
            data: { sequence: swapNewSeq },
          }),
        }),
      ]);

      const result1 = await res1.json();
      const result2 = await res2.json();

      if (!res1.ok || result1.status >= 400 || !res2.ok || result2.status >= 400) {
        throw new Error("Failed to update sequence");
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

  const handleRemove = async (relatedAssetId: string) => {
    if (!confirm("Remove this associated media?")) return;

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/related-assets/${relatedAssetId}`,
          method: "DELETE",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Asset removed",
        description: "Associated media has been removed.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to remove asset",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold">Associated Media ({assets.length})</h2>
          {assets.length > 0 && (
            <span
              className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                allSyncedToCdn
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
              }`}
              title={allSyncedToCdn ? "All assets synced to CDN" : `${cdnSyncedCount}/${assets.length} synced to CDN`}
            >
              <span className={`w-2 h-2 rounded-full ${allSyncedToCdn ? "bg-green-500" : "bg-amber-500"}`} />
              {allSyncedToCdn ? "CDN Ready" : `${cdnSyncedCount}/${assets.length} CDN`}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsFormOpen(!isFormOpen)}
          disabled={isAtLimit && !isFormOpen}
        >
          {isFormOpen ? "Cancel" : isAtLimit ? `Limit (${MAX_ITEMS})` : "Attach Media"}
        </Button>
      </div>

      {/* Add Form */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-3 bg-muted/30 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Asset Search */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Asset</label>
              <AsyncSearchableSelect
                searchEndpoint="/api/search/assets?type=all"
                placeholder="Search for assets..."
                value={assetId}
                onChange={(value, labelText) => {
                  setAssetId(value);
                  setAssetLabel(labelText || "");
                }}
                transformResult={(item) => ({
                  value: item.id,
                  label: `${item.title || item.name} (${item.assetType || "unknown"}) [${item.id.slice(0, 8)}]`,
                })}
              />
            </div>

            {/* Related Type */}
            <div className="w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <select
                value={relatedType}
                onChange={(e) => setRelatedType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                {RELATED_ASSET_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Label */}
            <div className="w-32">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Label</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Optional"
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              />
            </div>

            {/* Submit */}
            <Button type="submit" size="sm" disabled={isSubmitting || !assetId} className="h-10">
              {isSubmitting ? "Adding..." : "Add"}
            </Button>
          </div>
        </form>
      )}

      {/* Assets List */}
      {sortedAssets.length > 0 ? (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-2 py-3 text-left text-sm font-medium w-12">#</th>
                <th className="px-2 py-3 text-left text-sm font-medium w-20">Media</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                <th className="px-4 py-3 text-left text-sm font-medium w-24">Processing</th>
                <th className="px-4 py-3 text-left text-sm font-medium w-24">Publication</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Label</th>
                <th className="px-4 py-3 text-left text-sm font-medium w-24">Order</th>
                <th className="px-4 py-3 text-left text-sm font-medium w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map((asset, index) => (
                <tr key={asset.id} className="border-b hover:bg-muted/50">
                  <td className="px-2 py-3 text-sm text-center text-muted-foreground">
                    {(asset.sequence ?? index) + 1}
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex flex-col items-center gap-1">
                      {/* Thumbnail with CDN status indicator */}
                      <div className="relative">
                        {asset.thumbnailUrl ? (
                          <img
                            src={asset.thumbnailUrl}
                            alt=""
                            className="w-14 h-10 object-cover rounded"
                          />
                        ) : (
                          <div className="w-14 h-10 bg-muted rounded flex items-center justify-center">
                            <AssetTypeIcon assetType={asset.assetType} fileFormat={asset.fileFormat} />
                          </div>
                        )}
                        {/* CDN status indicator */}
                        <span
                          className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                            asset.hasCdnDelivery ? "bg-green-500" : "bg-amber-500"
                          }`}
                          title={asset.hasCdnDelivery ? "Synced to CDN" : "Not synced to CDN"}
                        />
                      </div>
                      {editingId === asset.id ? (
                        <select
                          value={asset.relatedType || "other"}
                          onChange={(e) => handleRelatedTypeChange(asset.id, e.target.value)}
                          onBlur={() => setEditingId(null)}
                          disabled={isUpdating}
                          autoFocus
                          className="text-xs border rounded px-1 py-0.5 bg-background w-full"
                        >
                          {RELATED_ASSET_TYPE_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingId(asset.id)}
                          className="hover:bg-muted rounded px-1 py-0.5 transition-colors"
                          title="Click to edit type"
                        >
                          <Badge variant="outline" className="text-xs cursor-pointer">
                            {getRelatedAssetTypeLabel(asset.relatedType) || "Other"}
                          </Badge>
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/assets/${asset.assetId}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {asset.title || asset.name || "Untitled"}
                    </Link>
                    {(asset.assetType || asset.fileFormat) && (
                      <span className="text-xs text-muted-foreground ml-2">
                        ({asset.assetType}{asset.fileFormat ? ` - ${asset.fileFormat}` : ""})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getProcessingStatusColor(asset.processingStatus)}`}>
                      {asset.processingStatus || "imported"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getPublicationStatusColor(asset.publicationStatus)}`}>
                      {asset.publicationStatus || "draft"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {editingLabelId === asset.id ? (
                      <input
                        type="text"
                        value={editingLabelValue}
                        onChange={(e) => setEditingLabelValue(e.target.value)}
                        onBlur={() => {
                          if (!isUpdating) {
                            if (editingLabelValue !== (asset.label || "")) {
                              handleLabelChange(asset.id, editingLabelValue);
                            } else {
                              setEditingLabelId(null);
                              setEditingLabelValue("");
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleLabelChange(asset.id, editingLabelValue);
                          } else if (e.key === "Escape") {
                            setEditingLabelId(null);
                            setEditingLabelValue("");
                          }
                        }}
                        disabled={isUpdating}
                        autoFocus
                        placeholder="Enter label..."
                        className="text-xs border rounded px-2 py-1 bg-background w-24"
                      />
                    ) : (
                      <button
                        onClick={() => {
                          setEditingLabelId(asset.id);
                          setEditingLabelValue(asset.label || "");
                        }}
                        className="hover:bg-muted rounded px-1 py-0.5 transition-colors text-muted-foreground"
                        title="Click to edit label"
                      >
                        {asset.label || "—"}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleMove(asset.id, "up")}
                        disabled={index === 0}
                        className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move up"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => handleMove(asset.id, "down")}
                        disabled={index === sortedAssets.length - 1}
                        className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
                        title="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button
                      onClick={() => handleRemove(asset.id)}
                      className="text-red-600 hover:underline text-xs"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No associated media yet. Click "Attach Media" to add supplemental materials.
        </p>
      )}
    </div>
  );
}
