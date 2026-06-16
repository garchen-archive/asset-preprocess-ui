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

interface SyncPreviewResponse {
  session_id: string;
  session_name: string;
  assets: AssetPreview[];
  transcripts: TranscriptPreview[];
}

interface SyncResult {
  session_id: string;
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

interface SessionBulkSyncProps {
  sessionId: string;
  sessionName: string;
  hasAssets: boolean;
}

export function SessionBulkSync({
  sessionId,
  sessionName,
  hasAssets,
}: SessionBulkSyncProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [preview, setPreview] = useState<SyncPreviewResponse | null>(null);
  const [selectedAssets, setSelectedAssets] = useState<Set<string>>(new Set());
  const [includeSynced, setIncludeSynced] = useState(false);
  const [syncTranscripts, setSyncTranscripts] = useState(false);
  const [result, setResult] = useState<SyncResult | null>(null);
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
          endpoint: `/api/v1/admin/sessions/${sessionId}/sync-preview`,
          method: "GET",
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status >= 400) {
        throw new Error(data.error || "Failed to fetch preview");
      }
      setPreview(data.data);
      // Pre-select unsynced assets
      const unsynced = new Set(
        data.data.assets
          .filter((a: AssetPreview) => !a.is_synced && a.can_sync)
          .map((a: AssetPreview) => a.id)
      );
      setSelectedAssets(unsynced);
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

  const selectAllUnsynced = () => {
    if (!preview) return;
    const ids = preview.assets
      .filter((a) => !a.is_synced && a.can_sync)
      .map((a) => a.id);
    setSelectedAssets(new Set(ids));
  };

  const handleSync = async () => {
    if (selectedAssets.size === 0) return;

    setSyncing(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/sessions/${sessionId}/bulk-sync`,
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
        description: `${data.data.assets.queued} asset(s) queued for sync.`,
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

  if (!hasAssets) {
    return null;
  }

  const unsyncedCount = preview?.assets.filter((a) => !a.is_synced).length || 0;
  const syncableTranscripts = preview?.transcripts.filter((t) => t.can_sync) || [];
  const unsyncedTranscripts = syncableTranscripts.filter((t) => !t.is_synced).length;
  const syncedTranscripts = syncableTranscripts.filter((t) => t.is_synced).length;

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        Sync Session to Mux
      </Button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            ref={modalRef}
            className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Sync Session to Mux</h2>
              <p className="text-sm text-muted-foreground">
                Select video/audio assets from "{sessionName}" to sync to Mux.
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
                    {result.assets.details.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {result.assets.details.map((d) => (
                          <div key={d.id} className="flex items-center gap-2 text-xs">
                            {d.action === "queued" ? (
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                            ) : d.action === "failed" ? (
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-300" />
                            )}
                            <span className="flex-1 truncate">{d.name}</span>
                            <span className="text-muted-foreground">{d.reason}</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                  {/* Asset selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">Video/Audio Assets ({preview.assets.length})</h4>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={selectAllUnsynced}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Select Unsynced ({unsyncedCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAssets(new Set())}
                          className="text-xs text-muted-foreground hover:underline"
                        >
                          Clear
                        </button>
                      </div>
                    </div>
                    <div className="rounded-lg border divide-y max-h-48 overflow-y-auto">
                      {preview.assets.length === 0 ? (
                        <p className="text-sm text-muted-foreground p-3">No video/audio assets in this session.</p>
                      ) : (
                        preview.assets.map((asset) => (
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
                              <p className="text-sm font-medium truncate">{asset.name}</p>
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
                        ))
                      )}
                    </div>
                  </div>

                  {/* Transcript preview */}
                  {preview.transcripts.length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Transcripts ({preview.transcripts.length})</h4>
                      <div className="rounded-lg border divide-y max-h-32 overflow-y-auto">
                        {preview.transcripts.map((tr) => (
                          <div key={tr.id} className="flex items-center gap-3 p-2 text-sm">
                            <div className="flex-1 min-w-0">
                              <span className="font-medium">
                                {tr.language.toUpperCase()} {tr.kind}
                              </span>
                              <span className="text-xs text-muted-foreground ml-2">({tr.stage})</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {tr.is_synced ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-green-500" />
                                  <span className="text-xs text-green-700">Synced</span>
                                </>
                              ) : tr.can_sync ? (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                                  <span className="text-xs text-blue-700">Ready</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-gray-300" />
                                  <span className="text-xs text-muted-foreground">{tr.sync_reason}</span>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

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
