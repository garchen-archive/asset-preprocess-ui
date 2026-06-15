"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { getVariantLabel } from "@/lib/variant-types";

interface SessionAsset {
  linkId: string;
  assetId: string;
  assetName: string | null;
  variantType: string;
  variantLabel: string | null;
}

interface CanonicalAssetSelectorProps {
  sessionId: string;
  assets: SessionAsset[];
  currentCanonicalId: string | null;
}

export function CanonicalAssetSelector({
  sessionId,
  assets,
  currentCanonicalId,
}: CanonicalAssetSelectorProps) {
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [canonicalId, setCanonicalId] = useState(currentCanonicalId);
  const { toast } = useToast();

  const handleSetCanonical = async (linkId: string) => {
    if (linkId === canonicalId) return;

    setIsUpdating(linkId);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/session-assets/${linkId}`,
          method: "PUT",
          data: {
            set_canonical: true,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      setCanonicalId(linkId);
      toast({
        title: "Canonical asset updated",
        description: "The canonical asset for this session has been changed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update canonical asset",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  const handleClearCanonical = async () => {
    if (!canonicalId) return;

    setIsUpdating("clear");
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/session-assets/${canonicalId}`,
          method: "PUT",
          data: {
            set_canonical: false,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      setCanonicalId(null);
      toast({
        title: "Canonical asset cleared",
        description: "No asset is set as canonical for this session.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear canonical asset",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(null);
    }
  };

  if (assets.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground">Canonical Asset</h3>
        {canonicalId && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-6"
            onClick={handleClearCanonical}
            disabled={isUpdating !== null}
          >
            Clear
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        The canonical asset is the primary recording for this session. Transcripts will sync to this asset.
      </p>
      <div className="space-y-2">
        {assets.map((asset) => {
          const isCanonical = asset.linkId === canonicalId;
          const isLoading = isUpdating === asset.linkId;

          return (
            <div
              key={asset.linkId}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isCanonical ? "border-green-300 bg-green-50" : "border-gray-200 hover:bg-muted/50"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                {isCanonical && (
                  <Badge className="bg-green-100 text-green-800 text-xs shrink-0">
                    Canonical
                  </Badge>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    {asset.assetName || "Unnamed asset"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {asset.variantLabel || getVariantLabel(asset.variantType)}
                  </p>
                </div>
              </div>
              {!isCanonical && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSetCanonical(asset.linkId)}
                  disabled={isUpdating !== null}
                  className="shrink-0"
                >
                  {isLoading ? "Setting..." : "Set as Canonical"}
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
