"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Rendition {
  resolution: string;
  url: string;
  status: string;
  bitrate?: number;
  file_size?: number;
}

interface DownloadsData {
  asset_id: string;
  playback_id: string;
  renditions: Rendition[];
  subtitles: Array<{
    language: string;
    name: string;
    track_id: string;
    url: string;
  }>;
}

interface AssetRenditionsProps {
  assetId: string;
  muxAssetId: string;
  playbackId: string;
  isReady: boolean;
  onRefresh?: () => void;
}

// Resolution order for display (highest first)
const RESOLUTION_ORDER = ["2160p", "1440p", "1080p", "720p", "540p", "480p", "360p", "270p", "audio-only"];

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Format bitrate to human readable
function formatBitrate(bps: number): string {
  if (bps === 0) return "";
  if (bps >= 1000000) {
    return (bps / 1000000).toFixed(1) + " Mbps";
  }
  return (bps / 1000).toFixed(0) + " kbps";
}

export function AssetRenditions({
  assetId,
  muxAssetId,
  playbackId,
  isReady,
  onRefresh,
}: AssetRenditionsProps) {
  const [renditions, setRenditions] = useState<Rendition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Fetch renditions on mount and when ready status changes
  useEffect(() => {
    if (isReady && playbackId) {
      fetchRenditions();
    }
  }, [assetId, isReady, playbackId]);

  const fetchRenditions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}/downloads`,
          method: "GET",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Failed to fetch downloads");
      }

      const data = result.data as DownloadsData;
      // Sort renditions by resolution order
      const sorted = (data.renditions || []).sort((a, b) => {
        return RESOLUTION_ORDER.indexOf(a.resolution) - RESOLUTION_ORDER.indexOf(b.resolution);
      });
      setRenditions(sorted);
    } catch (err) {
      console.error("Failed to fetch renditions:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch renditions");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateRenditions = async () => {
    setIsGenerating(true);
    try {
      // Call without specifying resolutions - backend will use config defaults
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}/renditions`,
          method: "POST",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Failed to generate renditions");
      }

      const data = result.data;

      // Show appropriate toast
      if (data.requested?.length > 0) {
        toast({
          title: "Renditions requested",
          description: `Generating: ${data.requested.join(", ")}. Check back shortly.`,
        });
      } else if (data.skipped?.length > 0) {
        toast({
          title: "Renditions skipped",
          description: `All requested renditions already exist or exceed source quality.`,
        });
      }

      // Refresh renditions list after a short delay
      setTimeout(() => {
        fetchRenditions();
        onRefresh?.();
      }, 2000);
    } catch (err) {
      toast({
        title: "Generation failed",
        description: err instanceof Error ? err.message : "Failed to request renditions",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Don't render if not ready
  if (!isReady) {
    return null;
  }

  const readyRenditions = renditions.filter((r) => r.status === "ready");
  const preparingRenditions = renditions.filter((r) => r.status === "preparing");
  const hasRenditions = renditions.length > 0;

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium">
          Static Renditions {isLoading ? "" : `(${readyRenditions.length} ready)`}
        </h3>
        <div className="flex items-center gap-2">
          {isLoading && (
            <span className="text-xs text-muted-foreground">Loading...</span>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleGenerateRenditions}
            disabled={isGenerating}
            title="Generate downloadable MP4 and audio renditions"
          >
            {isGenerating ? (
              <>
                <svg className="h-3 w-3 mr-1.5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </>
            ) : (
              "Generate Renditions"
            )}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      {preparingRenditions.length > 0 && (
        <div className="p-3 mb-3 rounded-lg bg-yellow-50 border border-yellow-200">
          <div className="flex items-center gap-2 text-sm text-yellow-700">
            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>
              Generating: {preparingRenditions.map((r) => r.resolution).join(", ")}
            </span>
          </div>
        </div>
      )}

      {hasRenditions ? (
        <div className="space-y-2">
          {renditions.map((rendition) => (
            <div
              key={rendition.resolution}
              className="flex items-center justify-between p-2 rounded bg-muted/30"
            >
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium w-20">
                  {rendition.resolution === "audio-only" ? "Audio" : rendition.resolution}
                </span>
                <Badge
                  variant={rendition.status === "ready" ? "default" : "secondary"}
                  className={
                    rendition.status === "ready"
                      ? "bg-green-100 text-green-700"
                      : rendition.status === "preparing"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {rendition.status}
                </Badge>
                {rendition.status === "ready" && (
                  <span className="text-xs text-muted-foreground">
                    {rendition.file_size ? formatBytes(rendition.file_size) : ""}
                    {rendition.file_size && rendition.bitrate ? " • " : ""}
                    {rendition.bitrate ? formatBitrate(rendition.bitrate) : ""}
                  </span>
                )}
              </div>
              {rendition.status === "ready" && (
                <a
                  href={rendition.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  <svg
                    className="h-3.5 w-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Download
                </a>
              )}
            </div>
          ))}
        </div>
      ) : !isLoading && (
        <div className="p-4 rounded-lg bg-muted/30 border border-dashed">
          <p className="text-sm text-muted-foreground text-center">
            No static renditions available. Click "Generate Renditions" to create
            downloadable MP4 and audio files.
          </p>
        </div>
      )}
    </div>
  );
}
