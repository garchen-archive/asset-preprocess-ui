"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface MuxTrack {
  track_id: string;
  language: string;
  name?: string;
  type?: string;
  text_type?: string;
  status: string;
  transcript_id?: string;
}

interface MuxSyncWidgetProps {
  assetId: string;
  mediaProvider?: string | null;
  mediaProviderAssetId?: string | null;
  playbackId?: string | null;
  status?: string | null;
  duration?: number | null;
  aspectRatio?: string | null;
  muxDashboardUrl?: string | null;
  onSyncComplete?: () => void;
}

export function MuxSyncWidget({
  assetId,
  mediaProvider,
  mediaProviderAssetId,
  playbackId,
  status,
  duration,
  aspectRatio,
  muxDashboardUrl,
  onSyncComplete,
}: MuxSyncWidgetProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [tracks, setTracks] = useState<MuxTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);
  const { toast } = useToast();

  // Fetch tracks when synced
  useEffect(() => {
    if (mediaProvider === "mux" && mediaProviderAssetId && status === "ready") {
      fetchTracks();
    }
  }, [mediaProvider, mediaProviderAssetId, status]);

  const fetchTracks = async () => {
    setIsLoadingTracks(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}/tracks`,
          method: "GET",
        }),
      });
      const result = await response.json();
      if (response.ok && result.data?.tracks) {
        setTracks(result.data.tracks);
      }
    } catch {
      // Silently fail - tracks section just won't show
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const isSynced = mediaProvider === "mux" && mediaProviderAssetId;
  const isReady = status === "ready";

  const handleSync = async () => {
    console.log("handleSync called for asset:", assetId);
    setIsSyncing(true);
    try {
      console.log("Sending sync request to pipeline...");
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}/sync`,
          method: "POST",
        }),
      });
      console.log("Sync response status:", response.status);

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Sync failed");
      }

      toast({
        title: isSynced ? "Re-sync initiated" : "Sync initiated",
        description: result.data?.job_id
          ? `Job ${result.data.job_id} created. Check jobs page for status.`
          : "Asset is being synced to Mux.",
      });

      onSyncComplete?.();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync asset",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDeleteTrack = async (trackId: string) => {
    if (!confirm("Remove this subtitle track from Mux?")) return;

    setIsDeleting(trackId);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}/tracks/${trackId}`,
          method: "DELETE",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Delete failed");
      }

      toast({
        title: "Track deleted",
        description: "Subtitle track removed from Mux.",
      });

      // Refresh tracks list
      fetchTracks();
      onSyncComplete?.();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete track",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  const handleSyncComplete = () => {
    fetchTracks();
    onSyncComplete?.();
  };

  const formatDuration = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // All tracks from API are subtitle tracks (the endpoint only returns text tracks)
  const subtitleTracks = tracks;

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Mux Integration</h2>
        {isSynced && muxDashboardUrl && (
          <a
            href={muxDashboardUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground hover:text-primary flex items-center gap-1"
          >
            <span>Open in Mux</span>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        )}
      </div>

      {/* Status Section */}
      <div className="mb-6">
        {!isSynced ? (
          // Not synced
          <div className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-dashed">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-muted-foreground">Not synced to Mux</p>
              <p className="text-sm text-muted-foreground mt-1">
                This video asset has not been synced to Mux.
                Sync required before transcripts can be added as subtitle tracks.
              </p>
              <Button
                size="sm"
                className="mt-3"
                onClick={handleSync}
                disabled={isSyncing}
              >
                {isSyncing ? "Syncing..." : "Sync to Mux"}
              </Button>
            </div>
          </div>
        ) : status === "preparing" ? (
          // Syncing in progress
          <div className="flex items-start gap-4 p-4 rounded-lg bg-yellow-50 border border-yellow-200">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-3 h-3 rounded-full bg-yellow-400 animate-pulse" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Syncing to Mux...</p>
              <p className="text-sm text-yellow-700 mt-1">
                Video is being processed. This may take a few minutes depending on file size.
              </p>
            </div>
          </div>
        ) : status === "errored" ? (
          // Error state
          <div className="flex items-start gap-4 p-4 rounded-lg bg-red-50 border border-red-200">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-red-800">Mux Sync Failed</p>
                  <p className="text-sm text-red-600 mt-1">
                    There was an error processing this video. Try re-syncing or check the source file.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  {isSyncing ? "Re-syncing..." : "Retry Sync"}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Synced and ready
          <div className="flex items-start gap-4 p-4 rounded-lg bg-green-50 border border-green-200">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="font-medium text-green-800">Synced to Mux</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  {isSyncing ? "Re-syncing..." : "Re-sync"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Grid - Only show when synced */}
      {isSynced && (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">Asset ID</dt>
              <dd className="font-mono text-xs mt-0.5">{mediaProviderAssetId}</dd>
            </div>
            {playbackId && (
              <div>
                <dt className="text-muted-foreground">Playback ID</dt>
                <dd className="font-mono text-xs mt-0.5">{playbackId}</dd>
              </div>
            )}
            {status && (
              <div>
                <dt className="text-muted-foreground">Status</dt>
                <dd className="mt-0.5">
                  <Badge variant={isReady ? "default" : "secondary"} className={isReady ? "bg-green-100 text-green-700" : ""}>
                    {status}
                  </Badge>
                </dd>
              </div>
            )}
            {duration && (
              <div>
                <dt className="text-muted-foreground">Duration</dt>
                <dd className="mt-0.5">{formatDuration(duration)}</dd>
              </div>
            )}
            {aspectRatio && (
              <div>
                <dt className="text-muted-foreground">Aspect Ratio</dt>
                <dd className="mt-0.5">{aspectRatio}</dd>
              </div>
            )}
          </dl>

          {/* Subtitle Tracks */}
          {isReady && (
            <div className="border-t pt-4 mt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">
                  Subtitle Tracks {isLoadingTracks ? "" : `(${subtitleTracks.length})`}
                </h3>
                {isLoadingTracks && (
                  <span className="text-xs text-muted-foreground">Loading...</span>
                )}
              </div>
              {subtitleTracks.length > 0 ? (
                <div className="space-y-2">
                  {subtitleTracks.map((track) => (
                    <div
                      key={track.track_id}
                      className="flex items-center justify-between p-2 rounded bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {track.name || track.language?.toUpperCase() || "Unknown"}
                        </span>
                        {track.text_type && (
                          <Badge variant="outline" className="text-xs">
                            {track.text_type}
                          </Badge>
                        )}
                        <Badge
                          variant={track.status === "ready" ? "default" : "secondary"}
                          className={track.status === "ready" ? "bg-green-100 text-green-700" : ""}
                        >
                          {track.status}
                        </Badge>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteTrack(track.track_id)}
                        disabled={isDeleting === track.track_id}
                        title="Remove track"
                      >
                        {isDeleting === track.track_id ? (
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No subtitle tracks. Add transcripts below and sync them to Mux.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
