"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface CdnSyncResult {
  asset_id: string;
  synced: boolean;
  provider: string;
  object_key: string;
  signed_url: string;
  expires_at: string;
  size: number;
  content_type: string;
  synced_at: string;
  message: string;
}

interface AssetCdnSyncProps {
  assetId: string;
  assetType: string | null;
  fileName: string | null;
  /** If true, auto-fetch signed URL on mount (for previously synced assets) */
  initialSynced?: boolean;
}

export function AssetCdnSync({ assetId, assetType, fileName, initialSynced = false }: AssetCdnSyncProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(initialSynced);
  const [result, setResult] = useState<CdnSyncResult | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  // Auto-fetch signed URL on mount if already synced
  useEffect(() => {
    if (initialSynced) {
      fetchSignedUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, initialSynced]);

  const fetchSignedUrl = async () => {
    setIsFetchingUrl(true);
    try {
      // Get asset details which includes delivery_url if synced
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}`,
          method: "GET",
        }),
      });

      const data = await response.json();

      if (response.ok && data.status < 400 && data.data?.delivery_url) {
        // Map the asset response to our result format
        setResult({
          asset_id: assetId,
          synced: true,
          provider: "backblaze",
          object_key: data.data.object_key || "",
          signed_url: data.data.delivery_url,
          expires_at: data.data.delivery_url_expires_at || "",
          size: data.data.file_size_bytes || 0,
          content_type: data.data.mime_type || "",
          synced_at: data.data.synced_at || "",
          message: "Delivery URL retrieved",
        });
      }
    } catch (error) {
      // Failed to fetch - user can manually refresh
      console.error("Failed to fetch delivery URL:", error);
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}/sync?target=cdn`,
          method: "POST",
        }),
      });

      const data = await response.json();

      if (!response.ok || data.status >= 400) {
        const errorMessage = data.message || data.data?.message || data.data?.error || `HTTP ${data.status}`;
        throw new Error(errorMessage);
      }

      setResult(data.data);
      toast({
        title: "Synced to CDN",
        description: data.data.message || "Asset synced successfully",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const copyUrl = async () => {
    if (result?.signed_url) {
      await navigator.clipboard.writeText(result.signed_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  // Show loading state while fetching URL on mount
  if (isFetchingUrl) {
    return (
      <div className="rounded-lg border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">CDN Delivery</h2>
        </div>
        <div className="flex items-center justify-center h-32 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 text-muted-foreground">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Loading...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-xl font-semibold">CDN Delivery</h2>
          <p className="text-sm text-muted-foreground">
            {result ? `Synced to ${result.provider}` : `Sync this ${assetType || "asset"} to Backblaze CDN for public delivery`}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSync}
          disabled={isLoading}
        >
          {isLoading ? "Syncing..." : result ? "Refresh URL" : "Sync to CDN"}
        </Button>
      </div>

      {result && (
        <div className="space-y-4 mt-4 pt-4 border-t">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
              result.synced ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
            }`}>
              {result.synced ? "Synced" : "Pending"}
            </span>
            <span className="text-sm text-muted-foreground">
              via {result.provider}
            </span>
          </div>

          {/* Details Grid */}
          <dl className="grid grid-cols-2 gap-3 text-sm">
            {result.content_type && (
              <div>
                <dt className="text-muted-foreground">Content Type</dt>
                <dd className="font-medium">{result.content_type}</dd>
              </div>
            )}
            {result.size != null && !isNaN(result.size) && (
              <div>
                <dt className="text-muted-foreground">Size</dt>
                <dd className="font-medium">{formatBytes(result.size)}</dd>
              </div>
            )}
            {result.synced_at && (
              <div>
                <dt className="text-muted-foreground">Synced At</dt>
                <dd className="font-medium">{formatDate(result.synced_at)}</dd>
              </div>
            )}
            {result.expires_at && (
              <div>
                <dt className="text-muted-foreground">URL Expires</dt>
                <dd className="font-medium">{formatDate(result.expires_at)}</dd>
              </div>
            )}
          </dl>

          {/* Signed URL */}
          <div>
            <dt className="text-sm text-muted-foreground mb-1">Signed URL</dt>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={result.signed_url}
                className="flex-1 text-xs bg-muted/50 rounded px-2 py-1.5 border font-mono truncate"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={copyUrl}
                className="shrink-0"
              >
                {copied ? "Copied!" : "Copy"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="shrink-0"
              >
                <a href={result.signed_url} target="_blank" rel="noopener noreferrer">
                  Open
                </a>
              </Button>
            </div>
          </div>

          {/* Object Key */}
          <div>
            <dt className="text-sm text-muted-foreground mb-1">Object Key</dt>
            <dd className="text-xs font-mono bg-muted/30 rounded px-2 py-1 break-all">
              {result.object_key}
            </dd>
          </div>

          {/* Image Preview - Show for image types */}
          {(result.content_type?.startsWith("image/") || assetType === "image") && result.signed_url && (
            <div className="mt-4 pt-4 border-t">
              <dt className="text-sm text-muted-foreground mb-2">Preview</dt>
              <div className="rounded-lg border overflow-hidden bg-muted/10">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.signed_url}
                  alt={fileName || "Asset preview"}
                  className="max-w-full h-auto max-h-[500px] object-contain mx-auto"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
