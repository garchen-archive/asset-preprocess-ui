"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { AsyncSearchableSelect } from "@/components/async-searchable-select";
import { createTranscript, linkTranscriptToSession } from "@/lib/actions";

const LANGUAGE_OPTIONS = [
  { value: "bo", label: "Tibetan" },
  { value: "en", label: "English" },
  { value: "zh", label: "Chinese" },
  { value: "es", label: "Spanish" },
  { value: "de", label: "German" },
  { value: "vi", label: "Vietnamese" },
  { value: "fr", label: "French" },
  { value: "pt", label: "Portuguese" },
  { value: "multi", label: "Multi-language" },
];

const KIND_OPTIONS = [
  { value: "transcript", label: "Transcript" },
  { value: "translation", label: "Translation" },
];

const SPOKEN_SOURCE_OPTIONS = [
  { value: "teacher", label: "Teacher" },
  { value: "interpreter", label: "Interpreter" },
  { value: "primary", label: "Primary (Default)" },
  { value: "translator", label: "Translator" },
  { value: "student", label: "Student" },
  { value: "mixed", label: "Mixed (Q&A, Panel)" },
];

const STAGE_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "editor_review", label: "Editor Review" },
  { value: "eic_review", label: "EIC Review" },
  { value: "transcription", label: "Transcription" },
  { value: "translation", label: "Translation" },
];

interface TranscriptData {
  id: string;
  language: string;
  kind: string;
  spokenSource?: string | null;
  publicationStatus: string;
  stage: string;
  mediaAssetId?: string | null;
  mediaAssetName?: string | null;
  subtitleTrackId?: string | null;
  syncedAt?: string | null;
}

interface SessionAsset {
  linkId: string;
  assetId: string;
  assetName: string | null;
  variantType: string;
  variantLabel: string | null;
}

interface LinkableTranscript {
  id: string;
  language: string;
  kind: string;
  spokenSource?: string | null;
  stage: string;
  isSynced: boolean;
}

interface SessionTranscriptListProps {
  sessionId: string;
  transcripts: TranscriptData[];
  sessionAssets: SessionAsset[];
  canonicalAssetLinkId?: string | null;
  linkableTranscripts?: LinkableTranscript[];
}

export function SessionTranscriptList({
  sessionId,
  transcripts,
  sessionAssets,
  canonicalAssetLinkId,
  linkableTranscripts = [],
}: SessionTranscriptListProps) {
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [linkingIds, setLinkingIds] = useState<Set<string>>(new Set());
  const [approvingIds, setApprovingIds] = useState<Set<string>>(new Set());
  const router = useRouter();
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

      router.refresh();
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

  // Find canonical asset details
  const canonicalAsset = sessionAssets.find(a => a.linkId === canonicalAssetLinkId);

  // Handle linking an existing transcript to this session
  const handleLinkTranscript = async (transcriptId: string) => {
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

      router.refresh();
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

  // Determine sync target for each transcript
  const getTranscriptSyncTarget = (transcript: TranscriptData) => {
    if (transcript.mediaAssetId) {
      // Has explicit media asset
      const asset = sessionAssets.find(a => a.assetId === transcript.mediaAssetId);
      return {
        type: "explicit" as const,
        assetId: transcript.mediaAssetId,
        assetName: transcript.mediaAssetName || asset?.assetName || "Unknown Asset",
      };
    }
    if (canonicalAsset) {
      // Falls back to canonical
      return {
        type: "canonical" as const,
        assetId: canonicalAsset.assetId,
        assetName: canonicalAsset.assetName || "Canonical Asset",
      };
    }
    return null;
  };

  const handleSyncTranscript = async (transcriptId: string, isResync: boolean) => {
    if (isResync) {
      const confirmed = confirm(
        "This transcript is already synced to Mux. Re-syncing will replace the existing subtitle track. Continue?"
      );
      if (!confirmed) return;
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

      toast({
        title: isResync ? "Re-sync initiated" : "Sync initiated",
        description: "Check jobs page for status.",
      });

      router.refresh();
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
      case "synced": return "bg-green-100 text-green-700";
      case "approved": return "bg-emerald-100 text-emerald-700";
      case "eic_review": return "bg-blue-100 text-blue-700";
      case "editor_review": return "bg-indigo-100 text-indigo-700";
      case "translation": return "bg-purple-100 text-purple-700";
      case "transcription": return "bg-yellow-100 text-yellow-700";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Transcripts ({transcripts.length})</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowQuickAdd(!showQuickAdd)}
          >
            {showQuickAdd ? "Cancel" : "Quick Add"}
          </Button>
          <Button size="sm" variant="ghost" asChild>
            <Link href={`/transcripts/new?eventSessionId=${sessionId}`}>
              Full Form
            </Link>
          </Button>
        </div>
      </div>

      {/* Quick Add Form - appears below header when open */}
      {showQuickAdd && (
        <div className="border rounded-lg p-4 bg-muted/30 mb-4">
          {/* Existing transcripts on canonical asset that can be linked */}
          {linkableTranscripts.length > 0 && (
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

          {/* Create New section */}
          <SessionTranscriptQuickAdd
            sessionId={sessionId}
            sessionAssets={sessionAssets}
            canonicalAsset={canonicalAsset}
            existingLanguages={[
              ...transcripts.map(t => `${t.language}-${t.kind}-${t.spokenSource}`),
              ...linkableTranscripts.map(t => `${t.language}-${t.kind}-${t.spokenSource}`),
            ]}
            onSuccess={() => {
              setShowQuickAdd(false);
              router.refresh();
            }}
            onCancel={() => setShowQuickAdd(false)}
          />
        </div>
      )}

      {/* Warning if no canonical asset */}
      {!canonicalAsset && sessionAssets.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <strong>No canonical asset set.</strong> Transcripts without an explicit media asset won't have a sync target.
            Set a canonical asset in the sidebar to enable default Mux sync.
          </p>
        </div>
      )}

      {transcripts.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No transcripts linked to this session. Click "Quick Add" to create one.
        </p>
      ) : (
        <div className="space-y-3">
          {transcripts.map((tr) => {
            const syncTarget = getTranscriptSyncTarget(tr);
            const isSynced = !!tr.subtitleTrackId;
            const isSyncing = syncingIds.has(tr.id);
            const isApproving = approvingIds.has(tr.id);
            const isApproved = tr.stage === "approved" || tr.stage === "synced";
            // Note: Only stage matters for Mux sync, not publicationStatus
            const canSync = syncTarget && isApproved;

            return (
              <div
                key={tr.id}
                className="p-3 rounded-lg bg-muted/30 border"
              >
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

                    {/* Sync Target */}
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

                  {/* Sync Actions */}
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
                          disabled={isSyncing || !syncTarget}
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
                        disabled={isSyncing}
                      >
                        {isSyncing ? "Syncing..." : "Sync to Mux"}
                      </Button>
                    ) : !syncTarget ? (
                      <span className="text-xs text-muted-foreground">No target</span>
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
                          <span className="text-xs text-muted-foreground">Not ready</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Row type for bulk transcript creation
interface TranscriptRow {
  id: string;
  canonicalAssetId: string;
  canonicalAssetName: string;
  mediaAssetId: string;
  mediaAssetName: string;
  language: string;
  kind: string;
  spokenSource: string;
  stage: string;
}

// Quick Add form for session transcripts - supports bulk creation with multiple SRT/VTT files
function SessionTranscriptQuickAdd({
  sessionId,
  sessionAssets,
  canonicalAsset,
  existingLanguages = [],
  onSuccess,
  onCancel,
}: {
  sessionId: string;
  existingLanguages?: string[];
  sessionAssets: SessionAsset[];
  canonicalAsset?: SessionAsset;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  // Current target asset selection (for new rows)
  const [currentMediaAssetId, setCurrentMediaAssetId] = useState(canonicalAsset?.assetId || "");
  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const { toast } = useToast();

  // Get current target asset name
  const currentTargetAsset = sessionAssets.find(a => a.assetId === currentMediaAssetId);

  // Add a new row when an SRT/VTT file is selected - captures current target asset
  const addRow = (assetId: string, assetName: string) => {
    // Prevent duplicate files
    if (rows.some(r => r.canonicalAssetId === assetId)) {
      toast({
        title: "File already added",
        description: "This SRT/VTT file is already in the list.",
        variant: "destructive",
      });
      return;
    }

    const newRow: TranscriptRow = {
      id: crypto.randomUUID(),
      canonicalAssetId: assetId,
      canonicalAssetName: assetName,
      mediaAssetId: currentMediaAssetId,
      mediaAssetName: currentTargetAsset?.assetName || "No target",
      language: "en",
      kind: "transcript",
      spokenSource: "teacher",
      stage: "approved",
    };
    setRows(prev => [...prev, newRow]);
  };

  // Update a row's properties
  const updateRow = (id: string, field: keyof TranscriptRow, value: string) => {
    setRows(prev => prev.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  // Remove a row
  const removeRow = (id: string) => {
    setRows(prev => prev.filter(row => row.id !== id));
  };

  // Check if a row would create a duplicate
  const isDuplicate = (row: TranscriptRow) => {
    return existingLanguages.includes(`${row.language}-${row.kind}-${row.spokenSource}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting || rows.length === 0) return;

    setIsSubmitting(true);
    setError(null);
    setCreatedCount(0);

    let successCount = 0;
    let lastError: string | null = null;

    for (const row of rows) {
      try {
        const formData = new FormData();
        formData.set("eventSessionId", sessionId);
        formData.set("mediaAssetId", row.mediaAssetId);
        formData.set("canonicalAssetId", row.canonicalAssetId);
        formData.set("language", row.language);
        formData.set("kind", row.kind);
        formData.set("spokenSource", row.spokenSource);
        formData.set("stage", row.stage);
        formData.set("timecodeStatus", "full"); // Has SRT file
        formData.set("publicationStatus", "draft");
        formData.set("skipRedirect", "true");

        const result = await createTranscript(formData);

        if (result?.error) {
          lastError = `${row.canonicalAssetName}: ${result.error}`;
        } else {
          successCount++;
          setCreatedCount(successCount);
        }
      } catch {
        lastError = `${row.canonicalAssetName}: Failed to create`;
      }
    }

    if (successCount > 0) {
      toast({
        title: `${successCount} transcript${successCount > 1 ? "s" : ""} created`,
        description: lastError
          ? `Some failed: ${lastError}`
          : "Transcripts have been linked to this session.",
      });
      onSuccess();
    } else {
      setError(lastError || "Failed to create transcripts");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h3 className="text-sm font-semibold mb-3">Create Transcripts from SRT/VTT Files</h3>

      {error && (
        <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {/* Target Asset + Add File in one row */}
        <div className="flex gap-3 items-end">
          <div className="w-1/3">
            <Label className="text-xs">Target Asset</Label>
            <select
              value={currentMediaAssetId}
              onChange={(e) => setCurrentMediaAssetId(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              <option value="">None</option>
              {sessionAssets.map((asset) => (
                <option key={asset.assetId} value={asset.assetId}>
                  {asset.assetName || "Unnamed"}
                  {asset.linkId === canonicalAsset?.linkId ? " (canonical)" : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <Label className="text-xs">Add SRT/VTT File</Label>
            <AsyncSearchableSelect
              searchEndpoint="/api/search/assets?type=transcript"
              value=""
              onChange={(value, label) => {
                if (value && label) {
                  addRow(value, label);
                }
              }}
              placeholder="Search for SRT/VTT file..."
              name="addFile"
              emptyLabel=""
              minChars={2}
            />
          </div>
        </div>

        {/* List of files to create transcripts for */}
        {rows.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Transcripts to create ({rows.length})</Label>
            <div className="space-y-1.5">
              {rows.map((row) => {
                const duplicate = isDuplicate(row);
                return (
                  <div
                    key={row.id}
                    className={`px-3 py-2 flex items-center gap-2 text-sm rounded-lg border-2 ${
                      duplicate
                        ? "bg-amber-50 border-amber-300"
                        : "bg-blue-50 border-blue-200"
                    }`}
                  >
                    {/* Target Asset: SRT filename */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs">
                        <span className="font-medium">{row.mediaAssetName}:</span>{" "}
                        <span className="text-muted-foreground">{row.canonicalAssetName}</span>
                      </p>
                    </div>

                    {/* Language */}
                    <select
                      value={row.language}
                      onChange={(e) => updateRow(row.id, "language", e.target.value)}
                      className="h-7 w-20 rounded border border-input bg-white px-1 text-xs"
                    >
                      {LANGUAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Kind */}
                    <select
                      value={row.kind}
                      onChange={(e) => updateRow(row.id, "kind", e.target.value)}
                      className="h-7 w-24 rounded border border-input bg-white px-1 text-xs"
                    >
                      {KIND_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Speaker */}
                    <select
                      value={row.spokenSource}
                      onChange={(e) => updateRow(row.id, "spokenSource", e.target.value)}
                      className="h-7 w-24 rounded border border-input bg-white px-1 text-xs"
                    >
                      {SPOKEN_SOURCE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Stage */}
                    <select
                      value={row.stage}
                      onChange={(e) => updateRow(row.id, "stage", e.target.value)}
                      className="h-7 w-24 rounded border border-input bg-white px-1 text-xs"
                    >
                      {STAGE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Duplicate warning */}
                    {duplicate && (
                      <span className="text-amber-600 flex-shrink-0" title="Duplicate combination exists">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </span>
                    )}

                    {/* Remove button */}
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-muted-foreground hover:text-red-600 p-1 flex-shrink-0"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-muted/30">
            Search and add SRT/VTT files above to create transcript records
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">
            {isSubmitting && `Creating... ${createdCount}/${rows.length}`}
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || rows.length === 0}
            >
              {isSubmitting ? "Creating..." : `Create ${rows.length} Transcript${rows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
