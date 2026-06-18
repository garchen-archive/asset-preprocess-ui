"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { linkTranscriptToSession } from "@/lib/actions";
import { TranscriptQuickAdd, SessionAsset } from "@/components/transcript-quick-add";

// Re-export SessionAsset for consumers
export type { SessionAsset };

export interface TranscriptData {
  id: string;
  language: string;
  kind: string;
  spokenSource?: string | null;
  publicationStatus: string;
  stage: string;
  mediaAssetId?: string | null;
  mediaAssetName?: string | null;
  canonicalAssetId?: string | null;
  canonicalAssetName?: string | null;
  subtitleTrackId?: string | null;
  syncedAt?: string | null;
  // Asset scope fields
  timecodeStatus?: string | null;
  source?: string | null;
  version?: number;
  // Session scope: indicates transcript comes from canonical asset, not directly linked
  viaCanonicalAsset?: boolean;
}

export interface LinkableTranscript {
  id: string;
  language: string;
  kind: string;
  spokenSource?: string | null;
  stage: string;
  isSynced: boolean;
}

interface TranscriptListProps {
  scope: "session" | "asset";
  transcripts: TranscriptData[];

  // Session scope props
  sessionId?: string;
  sessionAssets?: SessionAsset[];
  canonicalAssetLinkId?: string | null;
  linkableTranscripts?: LinkableTranscript[];

  // Asset scope props
  mediaAssetId?: string;
  assetType?: string | null;
  isMuxSynced?: boolean;

  // Common
  onRefresh?: () => void;
}

export function TranscriptList({
  scope,
  transcripts,
  // Session scope
  sessionId,
  sessionAssets = [],
  canonicalAssetLinkId,
  linkableTranscripts = [],
  // Asset scope
  mediaAssetId,
  assetType,
  isMuxSynced = false,
  // Common
  onRefresh,
}: TranscriptListProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [linkingIds, setLinkingIds] = useState<Set<string>>(new Set());
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const router = useRouter();
  const { toast } = useToast();

  const isSessionScope = scope === "session";
  const isAssetScope = scope === "asset";

  // Find canonical asset for session scope
  const canonicalAsset = isSessionScope
    ? sessionAssets.find(a => a.linkId === canonicalAssetLinkId)
    : undefined;

  // For asset scope: can show sync buttons only for video/audio
  const canShowSyncButton = isAssetScope
    ? (assetType === "video" || assetType === "audio")
    : true;

  // Refresh handler
  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else {
      router.refresh();
    }
  };

  // ========== Handlers ==========

  const handleDeleteTranscript = async (transcriptId: string, transcriptName: string) => {
    const confirmed = confirm(
      `Are you sure you want to delete "${transcriptName}"? This action cannot be undone.`
    );
    if (!confirmed) return;

    setDeletingIds(prev => new Set(prev).add(transcriptId));

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/transcripts/${transcriptId}`,
          method: "DELETE",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || "Delete failed");
      }

      toast({
        title: "Transcript deleted",
        description: `"${transcriptName}" has been removed.`,
      });

      handleRefresh();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: error instanceof Error ? error.message : "Failed to delete transcript",
        variant: "destructive",
      });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(transcriptId);
        return next;
      });
    }
  };

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

      handleRefresh();
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
    // For asset scope, fetch sync preview
    if (isAssetScope) {
      let preview: {
        can_sync: boolean;
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

        if (!confirm(message)) return;
      } else if (preview && !preview.can_sync) {
        toast({
          title: "Cannot sync",
          description: preview.warnings?.join(". ") || "Sync not available",
          variant: "destructive",
        });
        return;
      }
    } else {
      // Session scope - simpler confirmation
      if (isResync) {
        const confirmed = confirm(
          "This transcript is already synced to Mux. Re-syncing will replace the existing subtitle track. Continue?"
        );
        if (!confirmed) return;
      }
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
          ? "Job created. Check jobs page for status."
          : "Transcript is being synced to Mux.",
      });

      handleRefresh();
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

  // Session scope: link existing transcript to session
  const handleLinkTranscript = async (transcriptId: string) => {
    if (!sessionId) return;

    setLinkingIds(prev => new Set(prev).add(transcriptId));

    try {
      const result = await linkTranscriptToSession({
        transcriptId,
        sessionId,
      });

      if (!result.success) {
        throw new Error(result.error || "Failed to link transcript");
      }

      toast({
        title: "Transcript linked",
        description: "The transcript has been linked to this session.",
      });

      handleRefresh();
    } catch (error) {
      toast({
        title: "Link failed",
        description: error instanceof Error ? error.message : "Failed to link transcript",
        variant: "destructive",
      });
    } finally {
      setLinkingIds(prev => {
        const next = new Set(prev);
        next.delete(transcriptId);
        return next;
      });
    }
  };

  // Session scope: determine sync target for transcript
  const getTranscriptSyncTarget = (transcript: TranscriptData) => {
    if (!isSessionScope) return null;

    if (transcript.mediaAssetId) {
      const asset = sessionAssets.find(a => a.assetId === transcript.mediaAssetId);
      return {
        type: "explicit" as const,
        assetId: transcript.mediaAssetId,
        assetName: transcript.mediaAssetName || asset?.assetName || "Unknown Asset",
      };
    }
    if (canonicalAsset) {
      return {
        type: "canonical" as const,
        assetId: canonicalAsset.assetId,
        assetName: canonicalAsset.assetName || "Canonical Asset",
      };
    }
    return null;
  };

  // Asset scope: sync all unsynced transcripts
  const unsyncedTranscripts = transcripts.filter(
    tr => !tr.subtitleTrackId && (tr.stage === "approved" || tr.stage === "synced")
  );

  const handleSyncAll = async () => {
    if (unsyncedTranscripts.length === 0) return;

    const confirmed = confirm(
      `Sync ${unsyncedTranscripts.length} transcript(s) to Mux as subtitle tracks?`
    );
    if (!confirmed) return;

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
        // Continue with next
      }
    }

    setSyncingIds(new Set());
    toast({
      title: "Sync jobs created",
      description: `${unsyncedTranscripts.length} transcript(s) queued for sync. Check jobs page for status.`,
    });
    handleRefresh();
  };

  // ========== Helpers ==========

  const getStageBadgeClass = (stage: string) => {
    switch (stage) {
      case "synced": return "bg-green-100 text-green-700";
      case "approved": return "bg-emerald-100 text-emerald-700";
      case "eic_review": return "bg-blue-100 text-blue-700";
      case "editor_review": return "bg-indigo-100 text-indigo-700";
      case "translation": return "bg-purple-100 text-purple-700";
      case "transcription": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const getTranscriptDisplayName = (tr: TranscriptData) =>
    `${tr.language.toUpperCase()} ${tr.kind}${tr.spokenSource && tr.spokenSource !== "primary" ? ` (${tr.spokenSource})` : ""}`;

  // ========== Quick Add Props ==========

  const quickAddProps = isSessionScope
    ? {
        sessionId,
        sessionAssets,
        canonicalAsset,
        existingCombinations: [
          ...transcripts.map(t => `${t.mediaAssetId || ""}-${t.language}-${t.kind}-${t.spokenSource}`),
          ...linkableTranscripts.map(t => `${t.language}-${t.kind}-${t.spokenSource}`),
        ],
      }
    : {
        mediaAssetId,
      };

  // ========== Render ==========

  return (
    <div className="rounded-lg border p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">
          {isSessionScope ? `Transcripts (${transcripts.length})` : "Transcript Records"}
        </h2>
        <div className="flex gap-2">
          {/* Asset scope: Sync All button */}
          {isAssetScope && canShowSyncButton && isMuxSynced && unsyncedTranscripts.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncAll}
              disabled={syncingIds.size > 0}
            >
              {syncingIds.size > 0 ? "Syncing..." : `Sync All (${unsyncedTranscripts.length})`}
            </Button>
          )}

          {/* Quick Add button */}
          {canShowSyncButton && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowQuickAdd(!showQuickAdd)}
            >
              {showQuickAdd ? "Cancel" : (isAssetScope ? "+ Quick Add" : "Quick Add")}
            </Button>
          )}

          {/* Full Form link */}
          {canShowSyncButton && (
            <Button size="sm" variant="ghost" asChild>
              <Link href={isSessionScope
                ? `/transcripts/new?eventSessionId=${sessionId}`
                : `/transcripts/new?mediaAssetId=${mediaAssetId}`
              }>
                Full Form
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Quick Add Form */}
      {showQuickAdd && canShowSyncButton && (
        <div className={isSessionScope ? "border rounded-lg p-4 bg-muted/30 mb-4" : "mb-4"}>
          {/* Session scope: Linkable transcripts section */}
          {isSessionScope && linkableTranscripts.length > 0 && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg mb-4">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">
                Existing Transcripts on Canonical Asset
              </h4>
              <p className="text-xs text-blue-700 mb-3">
                These transcripts are already linked to the canonical asset. Link them to this session instead of creating duplicates.
              </p>
              <div className="space-y-2">
                {linkableTranscripts.map((tr) => (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between p-2 bg-white rounded border"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {tr.language.toUpperCase()} {tr.kind}
                        {tr.spokenSource && tr.spokenSource !== "primary" && (
                          <span className="text-muted-foreground font-normal"> ({tr.spokenSource})</span>
                        )}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {tr.stage}
                      </Badge>
                      {tr.isSynced && (
                        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                          Synced
                        </Badge>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleLinkTranscript(tr.id)}
                      disabled={linkingIds.has(tr.id)}
                    >
                      {linkingIds.has(tr.id) ? "Linking..." : "Link to Session"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Add form */}
          <TranscriptQuickAdd
            {...quickAddProps}
            onSuccess={() => {
              setShowQuickAdd(false);
              handleRefresh();
            }}
            onCancel={() => setShowQuickAdd(false)}
          />
        </div>
      )}

      {/* Warnings */}
      {isSessionScope && !canonicalAsset && sessionAssets.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>No canonical asset set.</strong> Transcripts without an explicit media asset won't have a sync target.
            Set a canonical asset in the sidebar to enable default Mux sync.
          </p>
        </div>
      )}

      {isAssetScope && !isMuxSynced && canShowSyncButton && transcripts.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> This asset is not synced to Mux. Sync the asset first before syncing transcripts as subtitle tracks.
          </p>
        </div>
      )}

      {/* Empty state */}
      {transcripts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {isSessionScope
            ? "No transcripts linked to this session. Click \"Quick Add\" to create one."
            : "No transcript records linked to this asset."}
        </p>
      ) : (
        <div className="space-y-3">
          {transcripts.map((tr) => {
            const syncTarget = getTranscriptSyncTarget(tr);
            const isSynced = !!tr.subtitleTrackId;
            const isSyncing = syncingIds.has(tr.id);
            const isApproving = approvingIds.has(tr.id);
            const isApproved = tr.stage === "approved" || tr.stage === "synced";
            const canSync = isSessionScope ? (!!syncTarget && isApproved) : (isMuxSynced && isApproved);

            return (
              <div
                key={tr.id}
                className={`p-3 rounded-lg bg-muted/30 border ${isAssetScope ? "flex items-center justify-between" : ""}`}
              >
                {isSessionScope ? (
                  // Session scope layout
                  <div className="flex items-start justify-between">
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
                        <Badge variant="outline" className={getStageBadgeClass(tr.stage)}>
                          {tr.stage.replace("_", " ")}
                        </Badge>
                      </div>
                      {tr.canonicalAssetName && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {tr.canonicalAssetName}
                        </p>
                      )}
                      {tr.viaCanonicalAsset && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200 mt-1">
                          via canonical asset
                        </Badge>
                      )}

                      {/* Sync Target (session scope only) */}
                      <div className="mt-1.5 text-xs">
                        {syncTarget ? (
                          <span className="text-muted-foreground">
                            Sync target:{" "}
                            <Link href={`/assets/${syncTarget.assetId}`} className="text-blue-600 hover:underline">
                              {syncTarget.assetName}
                            </Link>
                            {syncTarget.type === "canonical" && (
                              <span className="text-amber-600 ml-1">(canonical default)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-amber-600 flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            No sync target - set canonical or link to asset
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 ml-4">
                      {renderSyncActions(tr, isSynced, isSyncing, isApproving, isApproved, canSync, syncTarget)}
                      {renderDeleteButton(tr)}
                    </div>
                  </div>
                ) : (
                  // Asset scope layout
                  <>
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
                        {tr.version !== undefined && (
                          <span className="text-xs text-muted-foreground">v{tr.version}</span>
                        )}
                      </div>
                      {tr.canonicalAssetName && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {tr.canonicalAssetName}
                        </p>
                      )}
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

                    {/* Actions */}
                    {canShowSyncButton && (
                      <div className="flex items-center gap-2 ml-4">
                        {renderSyncActions(tr, isSynced, isSyncing, isApproving, isApproved, canSync, null)}
                      </div>
                    )}
                    {renderDeleteButton(tr)}
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  // ========== Render Helpers ==========

  function renderSyncActions(
    tr: TranscriptData,
    isSynced: boolean,
    isSyncing: boolean,
    isApproving: boolean,
    isApproved: boolean,
    canSync: boolean,
    syncTarget: { type: "explicit" | "canonical"; assetId: string; assetName: string } | null
  ) {
    if (isSynced) {
      return (
        <>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700">Synced</span>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handleSyncTranscript(tr.id, true)}
            disabled={isSyncing || (isSessionScope ? !syncTarget : !isMuxSynced)}
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
      );
    }

    if (canSync) {
      return (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleSyncTranscript(tr.id, false)}
          disabled={isSyncing || (isAssetScope && !isMuxSynced)}
        >
          {isSyncing ? "Syncing..." : "Sync to Mux"}
        </Button>
      );
    }

    if (isSessionScope && !syncTarget) {
      return <span className="text-xs text-muted-foreground">No target</span>;
    }

    return (
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
            {isAssetScope && !isMuxSynced ? "Asset not synced" : "Not synced"}
          </span>
        </div>
      </div>
    );
  }

  function renderDeleteButton(tr: TranscriptData) {
    return (
      <button
        type="button"
        onClick={() => handleDeleteTranscript(tr.id, getTranscriptDisplayName(tr))}
        disabled={deletingIds.has(tr.id)}
        className="p-1 text-muted-foreground hover:text-red-600 disabled:opacity-50 ml-2"
        title="Delete transcript"
      >
        {deletingIds.has(tr.id) ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        )}
      </button>
    );
  }
}
