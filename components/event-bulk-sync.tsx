"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface AssetPreview {
  id: string;
  name: string;
  type: string;
  is_synced: boolean;
  mux_asset_id?: string;
  mux_status?: string;
  can_sync: boolean;
  sync_reason?: string;
}

interface TranscriptPreview {
  id: string;
  language: string;
  kind: string;
  stage: string;
  is_synced: boolean;
  can_sync: boolean;
  sync_reason?: string;
  target_asset_id?: string;
}

interface SessionPreview {
  session_id: string;
  session_name: string;
  assets: AssetPreview[];
  transcripts: TranscriptPreview[];
}

interface SyncPreviewSummary {
  total_sessions: number;
  total_assets: number;
  synced_assets: number;
  unsynced_assets: number;
  total_transcripts: number;
  synced_transcripts: number;
  ready_transcripts: number;
}

interface SyncPreviewResponse {
  event_id: string;
  event_name: string;
  sessions: SessionPreview[];
  summary: SyncPreviewSummary;
}

interface SyncResult {
  event_id: string;
  assets: {
    total: number;
    queued: number;
    skipped: number;
    failed: number;
    details: Array<{
      id: string;
      name: string;
      action: string;
      reason?: string;
    }>;
  };
  transcripts?: {
    total: number;
    queued: number;
    skipped: number;
    failed: number;
    details: Array<{
      id: string;
      name: string;
      action: string;
      reason?: string;
    }>;
  };
}

interface EventBulkSyncProps {
  eventId: string;
  eventName: string;
  sessionCount: number;
}

export function EventBulkSync({
  eventId,
  eventName,
  sessionCount,
}: EventBulkSyncProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [preview, setPreview] = useState<SyncPreviewResponse | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [includeSynced, setIncludeSynced] = useState(false);
  const [syncTranscripts, setSyncTranscripts] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const modalRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { toast } = useToast();

  // Close modal on escape or click outside
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("keydown", handleEscape);
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const fetchPreview = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/events/${eventId}/sync-preview`,
          method: "GET",
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status >= 400) {
        throw new Error(data.error || "Failed to fetch preview");
      }
      setPreview(data.data);
      // Pre-select all unsynced assets
      const unsynced = new Set<string>();
      data.data.sessions.forEach((session: SessionPreview) => {
        session.assets.forEach((a: AssetPreview) => {
          if (!a.is_synced && a.can_sync) {
            unsynced.add(a.id);
          }
        });
      });
      setSelectedAssets(unsynced);
      // Expand sessions that have unsynced assets
      const sessionsWithUnsynced = new Set<string>();
      data.data.sessions.forEach((session: SessionPreview) => {
        if (session.assets.some((a: AssetPreview) => !a.is_synced && a.can_sync)) {
          sessionsWithUnsynced.add(session.session_id);
        }
      });
      setExpandedSessions(sessionsWithUnsynced);
    } catch (error) {
      toast({
        title: "Failed to load preview",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
      setOpen(false);
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = () => {
    setOpen(true);
    setResult(null);
    fetchPreview();
  };

  const toggleAsset = (assetId: string) => {
    setSelectedAssets((prev) => {
      const next = new Set(prev);
      if (next.has(assetId)) {
        next.delete(assetId);
      } else {
        next.add(assetId);
      }
      return next;
    });
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const selectAllUnsynced = () => {
    if (!preview) return;
    const ids = new Set<string>();
    preview.sessions.forEach((session) => {
      session.assets.forEach((a) => {
        if (!a.is_synced && a.can_sync) {
          ids.add(a.id);
        }
      });
    });
    setSelectedAssets(ids);
  };

  const handleSync = async () => {
    if (selectedAssets.size === 0) return;

    setSyncing(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/events/${eventId}/bulk-sync`,
          method: "POST",
          data: {
            asset_ids: Array.from(selectedAssets),
            include_synced: includeSynced,
            sync_transcripts: syncTranscripts,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status >= 400) {
        throw new Error(data.error || data.data?.error || "Sync failed");
      }
      setResult(data.data);
      toast({
        title: "Sync initiated",
        description: `${data.data.assets.queued} asset(s) queued for sync across ${preview?.summary.total_sessions || 0} sessions.`,
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (result) {
      router.refresh();
    }
  };

  if (sessionCount === 0) {
    return null;
  }

  const syncableTranscripts = preview?.sessions.flatMap(s => s.transcripts.filter(t => t.can_sync)) || [];
  const unsyncedTranscripts = syncableTranscripts.filter(t => !t.is_synced).length;
  const syncedTranscripts = syncableTranscripts.filter(t => t.is_synced).length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        Sync Event to Mux
      </Button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            ref={modalRef}
            className="bg-background rounded-lg shadow-lg w-full max-w-3xl max-h-[85vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Sync Event to Mux</h2>
              <p className="text-sm text-muted-foreground">
                Sync video/audio assets from all sessions in &quot;{eventName}&quot; to Mux.
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <svg className="animate-spin h-8 w-8 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                </div>
              ) : result ? (
                // Show result
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <h4 className="font-semibold mb-2">Sync Results</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Queued:</span>{" "}
                        <span className="font-medium text-green-600">{result.assets.queued}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Skipped:</span>{" "}
                        <span className="font-medium">{result.assets.skipped}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>{" "}
                        <span className="font-medium text-red-600">{result.assets.failed}</span>
                      </div>
                    </div>
                  </div>
                  {result.transcripts && (
                    <div className="rounded-lg border p-4 bg-muted/30">
                      <h4 className="font-semibold mb-2">Transcript Results</h4>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Queued:</span>{" "}
                          <span className="font-medium text-green-600">{result.transcripts.queued}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Skipped:</span>{" "}
                          <span className="font-medium">{result.transcripts.skipped}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Failed:</span>{" "}
                          <span className="font-medium text-red-600">{result.transcripts.failed}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : preview ? (
                // Show preview and selection
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="rounded-lg border p-4 bg-blue-50/50">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Sessions:</span>{" "}
                        <span className="font-medium">{preview.summary.total_sessions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Assets:</span>{" "}
                        <span className="font-medium">{preview.summary.total_assets}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({preview.summary.unsynced_assets} unsynced)
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Transcripts:</span>{" "}
                        <span className="font-medium">{preview.summary.total_transcripts}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({preview.summary.ready_transcripts} ready)
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Selected:</span>{" "}
                        <span className="font-medium text-blue-600">{selectedAssets.size}</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick actions */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={selectAllUnsynced}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      Select All Unsynced ({preview.summary.unsynced_assets})
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedAssets(new Set())}
                      className="text-xs text-muted-foreground hover:underline"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Sessions with assets */}
                  <div className="space-y-2">
                    {preview.sessions.map((session) => {
                      const isExpanded = expandedSessions.has(session.session_id);
                      const unsyncedCount = session.assets.filter(a => !a.is_synced).length;
                      const selectedCount = session.assets.filter(a => selectedAssets.has(a.id)).length;

                      return (
                        <div key={session.session_id} className="rounded-lg border">
                          {/* Session header */}
                          <button
                            type="button"
                            onClick={() => toggleSession(session.session_id)}
                            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 text-left"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">
                                {isExpanded ? "▼" : "▶"}
                              </span>
                              <span className="font-medium text-sm">{session.session_name}</span>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{session.assets.length} assets</span>
                              {unsyncedCount > 0 && (
                                <span className="text-orange-600">{unsyncedCount} unsynced</span>
                              )}
                              {selectedCount > 0 && (
                                <span className="text-blue-600">{selectedCount} selected</span>
                              )}
                            </div>
                          </button>

                          {/* Session assets (collapsible) */}
                          {isExpanded && session.assets.length > 0 && (
                            <div className="border-t divide-y">
                              {session.assets.map((asset) => (
                                <label
                                  key={asset.id}
                                  className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 ${
                                    !asset.can_sync ? "opacity-50" : ""
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedAssets.has(asset.id)}
                                    onChange={() => toggleAsset(asset.id)}
                                    disabled={!asset.can_sync}
                                    className="h-4 w-4 rounded border-gray-300"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm truncate">{asset.name}</p>
                                    <p className="text-xs text-muted-foreground">{asset.type}</p>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {asset.is_synced ? (
                                      <>
                                        <span className="w-2 h-2 rounded-full bg-green-500" />
                                        <span className="text-xs text-green-700">Synced</span>
                                      </>
                                    ) : (
                                      <>
                                        <span className="w-2 h-2 rounded-full bg-gray-300" />
                                        <span className="text-xs text-muted-foreground">Not synced</span>
                                      </>
                                    )}
                                  </div>
                                </label>
                              ))}
                            </div>
                          )}

                          {/* Empty state */}
                          {isExpanded && session.assets.length === 0 && (
                            <div className="border-t p-3 text-sm text-muted-foreground text-center">
                              No video/audio assets in this session
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Options */}
                  <div className="space-y-3 pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeSynced}
                        onChange={(e) => setIncludeSynced(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="text-sm">
                        <span>Force re-sync already synced items</span>
                        <p className="text-xs text-muted-foreground">Re-upload videos and transcripts even if already on Mux</p>
                      </div>
                    </label>
                    {syncableTranscripts.length > 0 && (
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={syncTranscripts}
                          onChange={(e) => setSyncTranscripts(e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300"
                        />
                        <div className="text-sm">
                          <span>Also sync transcripts</span>
                          <p className="text-xs text-muted-foreground">
                            {unsyncedTranscripts > 0 && `${unsyncedTranscripts} ready to sync`}
                            {unsyncedTranscripts > 0 && syncedTranscripts > 0 && ", "}
                            {syncedTranscripts > 0 && `${syncedTranscripts} already synced`}
                          </p>
                        </div>
                      </label>
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              {result ? (
                <Button onClick={handleClose}>Close</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={syncing}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSync}
                    disabled={syncing || selectedAssets.size === 0}
                  >
                    {syncing ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Syncing...
                      </>
                    ) : (
                      `Sync ${selectedAssets.size} Asset${selectedAssets.size !== 1 ? "s" : ""}`
                    )}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
