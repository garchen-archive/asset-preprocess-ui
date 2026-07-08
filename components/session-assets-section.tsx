"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AsyncSearchableSelect } from "@/components/async-searchable-select";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { SortableAssetTable } from "@/components/sortable-asset-table";
import { SessionBulkSync } from "@/components/session-bulk-sync";
import { VARIANT_TYPE_OPTIONS } from "@/lib/variant-types";

interface AssetLink {
  id: string;
  linkId: string;
  title: string | null;
  name: string | null;
  assetType: string | null;
  duration: string | null;
  catalogingStatus: string | null;
  processingStatus: string | null;
  publicationStatus: string | null;
  variantType: string;
  variantLabel: string | null;
  isCanonical: boolean;
  primaryLocale: string | null;
}

interface SessionAssetsSectionProps {
  sessionId: string;
  sessionName: string;
  assets: AssetLink[];
}

export function SessionAssetsSection({ sessionId, sessionName, assets }: SessionAssetsSectionProps) {
  const [isLinkFormOpen, setIsLinkFormOpen] = useState(false);
  const [assetId, setAssetId] = useState("");
  const [assetLabel, setAssetLabel] = useState("");
  const [variantType, setVariantType] = useState("source");
  const [variantLabel, setVariantLabel] = useState("");
  const [setCanonical, setSetCanonical] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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
          endpoint: `/api/v1/admin/sessions/${sessionId}/assets`,
          method: "POST",
          data: {
            asset_id: assetId,
            variant_type: variantType,
            variant_label: variantLabel || undefined,
            set_canonical: setCanonical,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Asset attached",
        description: `${assetLabel || "Asset"} has been attached to this session.`,
      });

      // Reset form and close
      resetForm();
      setIsLinkFormOpen(false);

      // Refresh the page to show the new asset
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
    setVariantType("source");
    setVariantLabel("");
    setSetCanonical(false);
  };

  const handleCancel = () => {
    resetForm();
    setIsLinkFormOpen(false);
  };

  const handleVariantChange = async (linkId: string, newVariantType: string) => {
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/session-assets/${linkId}`,
          method: "PATCH",
          data: {
            variant_type: newVariantType,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Variant updated",
        description: "Asset variant type has been updated.",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update variant",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Assets ({assets.length})</h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsLinkFormOpen(!isLinkFormOpen)}
          >
            {isLinkFormOpen ? "Cancel" : "Attach Asset"}
          </Button>
          <SessionBulkSync
            sessionId={sessionId}
            sessionName={sessionName}
            hasAssets={assets.length > 0}
          />
        </div>
      </div>

      {/* Link Asset Form - appears below header when open */}
      {isLinkFormOpen && (
        <form onSubmit={handleSubmit} className="border rounded-lg p-3 bg-muted/30 mb-4">
          <div className="flex flex-wrap items-end gap-3">
            {/* Asset Search - takes most space */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Asset</label>
              <AsyncSearchableSelect
                searchEndpoint="/api/search/assets?type=media"
                placeholder="Search for media assets..."
                value={assetId}
                onChange={(value, label) => {
                  setAssetId(value);
                  setAssetLabel(label || "");
                }}
                transformResult={(item) => ({
                  value: item.id,
                  label: `${item.title || item.name} (${item.assetType}${item.fileFormat ? ` - ${item.fileFormat}` : ""}) [${item.id.slice(0, 8)}]`,
                })}
              />
            </div>

            {/* Variant Type */}
            <div className="w-28">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
              <select
                value={variantType}
                onChange={(e) => setVariantType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                {VARIANT_TYPE_OPTIONS.map((vt) => (
                  <option key={vt.value} value={vt.value}>
                    {vt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Variant Label */}
            <div className="w-28">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Label</label>
              <input
                type="text"
                value={variantLabel}
                onChange={(e) => setVariantLabel(e.target.value)}
                placeholder="e.g., 1080p"
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              />
            </div>

            {/* Canonical checkbox */}
            <div className="flex items-center gap-1.5 h-10">
              <input
                id="setCanonical"
                type="checkbox"
                checked={setCanonical}
                onChange={(e) => setSetCanonical(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label htmlFor="setCanonical" className="text-xs whitespace-nowrap">
                Canonical
              </label>
            </div>

            {/* Submit button */}
            <Button type="submit" size="sm" disabled={isSubmitting || !assetId} className="h-10">
              {isSubmitting ? "Attaching..." : "Attach"}
            </Button>
          </div>
        </form>
      )}

      {/* Assets Table */}
      {assets.length > 0 ? (
        <SortableAssetTable
          assets={assets}
          showVariantColumn
          showLocaleColumn
          tableId="assets"
          onVariantChange={handleVariantChange}
        />
      ) : (
        <p className="text-sm text-muted-foreground">
          No assets attached to this session yet. Click "Attach Asset" to add one.
        </p>
      )}
    </div>
  );
}
