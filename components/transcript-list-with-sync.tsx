"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { TranscriptQuickAdd } from "./transcript-quick-add";

interface TranscriptData {
  id: string;
  language: string;
  kind: string;
  spokenSource?: string | null;
  publicationStatus: string;
  stage: string;
  timecodeStatus?: string | null;
  source?: string | null;
  version: number;
  subtitleTrackId?: string | null;
  syncedAt?: string | null;
}

interface TranscriptListWithSyncProps {
  assetId: string;
  assetType?: string | null;
  transcripts: TranscriptData[];
  isMuxSynced: boolean;
  onSyncComplete?: () => void;
}

export function TranscriptListWithSync({
  assetId,
  assetType,
  transcripts,
  isMuxSynced,
  onSyncComplete,
}: TranscriptListWithSyncProps) {
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const { toast } = useToast();

  const handleApproveTranscript = async (transcriptId: string) => {
    setApprovingIds(prev => new Set(prev).add(transcriptId));

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/transcripts/${transcriptId}`,
          method: "PATCH",
          data: { stage: "approved" },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Approve failed");
      }

      toast({
        title: "Transcript approved",
        description: "The transcript is now ready to sync to Mux.",
      });

      onSyncComplete?.();
    } catch (error) {
      toast({
        title: "Approve failed",
        description: error instanceof Error ? error.message : "Failed to approve transcript",
        variant: "destructive",
      });
    } finally {
      setApprovingIds(prev => {
        const next = new Set(prev);
        next.delete(transcriptId);
        return next;
      });
    }
  };

  const handleSyncTranscript = async (transcriptId: string, isResync: boolean) => {
    // Fetch sync preview to get detailed info
    let preview: {
      can_sync: boolean;
      action: string;
      reason?: string;
      content_changed: boolean;
      warnings?: string[];
    } | null = null;

    try {
      const previewResponse = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/transcripts/${transcriptId}/sync-preview`,
          method: "GET",
        }),
      });
      const previewResult = await previewResponse.json();
      if (previewResponse.ok && previewResult.data) {
        preview = previewResult.data;
      }
    } catch {
      // Continue without preview
    }

    // Build confirmation message based on preview
    if (isResync) {
      let message = "This transcript is already synced to Mux.";
      if (preview?.content_changed) {
        message += "\n\nContent has changed since last sync. Re-syncing will update the subtitle track.";
      } else {
        message += "\n\nContent appears unchanged. Re-syncing will replace the existing subtitle track anyway.";
      }
      if (preview?.warnings?.length) {
        message += "\n\nWarnings:\n• " + preview.warnings.join("\n• ");
      }
      message += "\n\nContinue?";

      const confirmed = confirm(message);
      if (!confirmed) return;
    } else if (preview && !preview.can_sync) {
      toast({
        title: "Cannot sync",
        description: preview.warnings?.join(". ") || "Sync not available",
        variant: "destructive",
      });
      return;
    }

    setSyncingIds(prev => new Set(prev).add(transcriptId));

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/transcripts/${transcriptId}/sync`,
          method: "POST",
          data: { force: isResync },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Sync failed");
      }

      const actionLabel = result.data?.is_resync
        ? (result.data?.content_changed ? "Update" : "Re-sync")
        : "Sync";

      toast({
        title: `${actionLabel} initiated`,
        description: result.data?.job_id
          ? `Job created. Check jobs page for status.`
          : "Transcript is being synced to Mux.",
      });

      onSyncComplete?.();
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Failed to sync transcript",
        variant: "destructive",
      });
    } finally {
      setSyncingIds(prev => {
        const next = new Set(prev);
        next.delete(transcriptId);
        return next;
      });
    }
  };

  const getStageBadgeClass = (stage: string) => {
    switch (stage) {
      case "synced":
        return "bg-green-100 text-green-700";
      case "approved":
        return "bg-emerald-100 text-emerald-700";
      case "eic_review":
        return "bg-blue-100 text-blue-700";
      case "editor_review":
        return "bg-indigo-100 text-indigo-700";
      case "translation":
        return "bg-purple-100 text-purple-700";
      case "transcription":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const canShowSyncButton = assetType === "video" || assetType === "audio";

  // Find transcripts that can be synced (approved/synced stage and not already synced)
  // Note: Only stage matters for Mux sync, not publicationStatus
  const unsyncedTranscripts = transcripts.filter(
    tr => !tr.subtitleTrackId && (tr.stage === "approved" || tr.stage === "synced")
  );

  const handleSyncAll = async () => {
    if (unsyncedTranscripts.length === 0) return;

    const confirmed = confirm(
      `Sync ${unsyncedTranscripts.length} transcript(s) to Mux as subtitle tracks?`
    );
    if (!confirmed) return;

    // Sync each transcript sequentially
    for (const tr of unsyncedTranscripts) {
      setSyncingIds(prev => new Set(prev).add(tr.id));
      try {
        await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/api/v1/transcripts/${tr.id}/sync`,
            method: "POST",
          }),
        });
      } catch {
        // Continue with next transcript
      }
    }

    setSyncingIds(new Set());
    toast({
      title: "Sync jobs created",
      description: `${unsyncedTranscripts.length} transcript(s) queued for sync. Check jobs page for status.`,
    });
    onSyncComplete?.();
  };

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Transcript Records</h2>
        <div className="flex gap-2">
          {canShowSyncButton && isMuxSynced && unsyncedTranscripts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncAll}
              disabled={syncingIds.size > 0}
            >
              {syncingIds.size > 0 ? "Syncing..." : `Sync All (${unsyncedTranscripts.length})`}
            </Button>
          )}
          {canShowSyncButton && !showQuickAdd && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowQuickAdd(true)}
            >
              + Quick Add
            </Button>
          )}
          {canShowSyncButton && (
            <Button size="sm" variant="ghost" asChild>
              <Link href={`/transcripts/new?mediaAssetId=${assetId}`}>
                Full Form
              </Link>
            </Button>
          )}
        </div>
      </div>

      {!isMuxSynced && canShowSyncButton && transcripts.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> This asset is not synced to Mux. Sync the asset first before syncing transcripts as subtitle tracks.
          </p>
        </div>
      )}

      {transcripts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No transcript records linked to this asset.
        </p>
      ) : (
        <div className="space-y-3">
          {transcripts.map((tr) => {
            const isSynced = !!tr.subtitleTrackId;
            const isSyncing = syncingIds.has(tr.id);
            const isApproving = approvingIds.has(tr.id);
            const isApproved = tr.stage === "approved" || tr.stage === "synced";
            // Note: Only stage matters for Mux sync, not publicationStatus
            const canSync = isMuxSynced && isApproved;

            return (
              <div
                key={tr.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/transcripts/${tr.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {tr.language.toUpperCase()} {tr.kind}
                      {tr.spokenSource && tr.spokenSource !== "primary" && tr.spokenSource !== "mixed" && (
                        <span className="text-muted-foreground font-normal"> ({tr.spokenSource})</span>
                      )}
                    </Link>
                    <span className="text-xs text-muted-foreground">v{tr.version}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge variant="outline" className={getStageBadgeClass(tr.stage)}>
                      {tr.stage.replace("_", " ")}
                    </Badge>
                    {tr.timecodeStatus && tr.timecodeStatus !== "none" && (
                      <span className="text-xs text-muted-foreground">
                        Timecode: {tr.timecodeStatus}
                      </span>
                    )}
                    {tr.source && (
                      <span className="text-xs text-muted-foreground capitalize">
                        ({tr.source})
                      </span>
                    )}
                  </div>
                </div>

                {/* Mux Sync Status & Actions */}
                {canShowSyncButton && (
                  <div className="flex items-center gap-2 ml-4">
                    {isSynced ? (
                      <>
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-green-500" />
                          <span className="text-xs text-green-700">Synced</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleSyncTranscript(tr.id, true)}
                          disabled={isSyncing || !isMuxSynced}
                          title="Re-sync to Mux"
                        >
                          {isSyncing ? (
                            <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : (
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                          )}
                        </Button>
                      </>
                    ) : canSync ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSyncTranscript(tr.id, false)}
                        disabled={isSyncing || !isMuxSynced}
                      >
                        {isSyncing ? "Syncing..." : "Sync to Mux"}
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        {!isApproved && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveTranscript(tr.id)}
                            disabled={isApproving}
                            className="text-xs"
                          >
                            {isApproving ? "Approving..." : "Approve"}
                          </Button>
                        )}
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                          <span className="text-xs text-muted-foreground">
                            {!isMuxSynced ? "Asset not synced" : "Not synced"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Add Form */}
      {showQuickAdd && canShowSyncButton && (
        <TranscriptQuickAdd
          mediaAssetId={assetId}
          onSuccess={() => {
            setShowQuickAdd(false);
            onSyncComplete?.();
          }}
          onCancel={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
}
