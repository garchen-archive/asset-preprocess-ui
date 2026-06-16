"use client";

import { Button } from "@/components/ui/button";
import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";

interface DeletePreview {
  asset: {
    id: string;
    name: string;
    asset_type: string;
    has_mux_asset: boolean;
    mux_asset_id?: string;
  };
  transcripts: Array<{
    id: string;
    language: string;
    spoken_source: string;
    has_mux_track: boolean;
    mux_track_id?: string;
  }>;
  can_delete: boolean;
  warnings?: string[];
}

interface DeleteAssetButtonProps {
  id: string;
  assetType?: string;
  hasLinkedTranscripts?: boolean;
}

export function DeleteAssetButton({ id, assetType, hasLinkedTranscripts }: DeleteAssetButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [cascadeTranscripts, setCascadeTranscripts] = useState(true);
  const [cascadeMuxTracks, setCascadeMuxTracks] = useState(true);
  const [deleteMux, setDeleteMux] = useState(false);
  const router = useRouter();

  // Check if this is an SRT/VTT asset that might have linked transcripts
  const isSubtitleAsset = assetType === "srt" || assetType === "vtt";
  const needsPreview = isSubtitleAsset || hasLinkedTranscripts;

  // Fetch delete preview when showing confirm dialog
  useEffect(() => {
    if (showConfirm && needsPreview && !preview) {
      setLoadingPreview(true);
      fetch(`/api/pipeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${id}/delete-preview`,
          method: "GET",
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.data) {
            setPreview(data.data);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch delete preview:", err);
        })
        .finally(() => {
          setLoadingPreview(false);
        });
    }
  }, [showConfirm, needsPreview, preview, id]);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        // Build query params
        const params = new URLSearchParams({ hard: "true" });

        // Add cascade option if transcripts exist
        if (preview?.transcripts?.length && cascadeTranscripts) {
          if (cascadeMuxTracks) {
            params.set("cascade", "full");
          } else {
            params.set("cascade", "transcript");
          }
        }

        // Add delete_mux for video assets
        if (deleteMux && preview?.asset?.has_mux_asset) {
          params.set("delete_mux", "true");
        }

        const response = await fetch(`/api/pipeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/api/v1/assets/${id}?${params.toString()}`,
            method: "DELETE",
          }),
        });

        const data = await response.json();

        if (!response.ok || data.status >= 400) {
          throw new Error(data.error || data.data?.message || "Failed to delete asset");
        }

        router.push("/assets");
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to delete asset");
        setShowConfirm(false);
      }
    });
  };

  if (!showConfirm) {
    return (
      <div className="space-y-2">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button
          type="button"
          variant="destructive"
          onClick={() => setShowConfirm(true)}
        >
          Delete Asset
        </Button>
      </div>
    );
  }

  // Enhanced confirmation dialog for assets with linked transcripts
  if (needsPreview) {
    return (
      <div className="space-y-4 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="font-semibold text-destructive">Delete Confirmation</span>
        </div>

        {loadingPreview ? (
          <p className="text-sm text-muted-foreground">Loading preview...</p>
        ) : preview ? (
          <div className="space-y-3">
            {/* Warnings */}
            {preview.warnings && preview.warnings.length > 0 && (
              <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
                {preview.warnings.map((w, i) => (
                  <p key={i} className="text-amber-800">{w}</p>
                ))}
              </div>
            )}

            {/* Linked transcripts */}
            {preview.transcripts && preview.transcripts.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  This asset is linked to {preview.transcripts.length} transcript(s):
                </p>
                <div className="pl-4 space-y-1">
                  {preview.transcripts.map((t) => (
                    <div key={t.id} className="text-sm flex items-center gap-2">
                      <span className="font-mono text-xs bg-muted px-1 rounded">
                        {t.language.toUpperCase()}
                      </span>
                      <span className="text-muted-foreground">{t.spoken_source}</span>
                      {t.has_mux_track && (
                        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                          Mux Track
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Cascade options */}
                <div className="pt-2 space-y-2">
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={cascadeTranscripts}
                      onChange={(e) => setCascadeTranscripts(e.target.checked)}
                      className="rounded"
                    />
                    <span>Also delete linked transcript records</span>
                  </label>

                  {cascadeTranscripts && preview.transcripts.some((t) => t.has_mux_track) && (
                    <label className="flex items-center gap-2 text-sm cursor-pointer pl-6">
                      <input
                        type="checkbox"
                        checked={cascadeMuxTracks}
                        onChange={(e) => setCascadeMuxTracks(e.target.checked)}
                        className="rounded"
                      />
                      <span>Also delete Mux subtitle tracks</span>
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Mux video asset option */}
            {preview.asset?.has_mux_asset && (
              <div className="pt-2 border-t">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteMux}
                    onChange={(e) => setDeleteMux(e.target.checked)}
                    className="rounded"
                  />
                  <span>Also delete from Mux ({preview.asset.mux_asset_id?.substring(0, 12)}...)</span>
                </label>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm">Are you sure you want to delete this asset?</p>
        )}

        <div className="flex gap-2 pt-2">
          <Button
            type="button"
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={isPending || loadingPreview}
          >
            {isPending ? "Deleting..." : "Delete"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setShowConfirm(false);
              setPreview(null);
            }}
            disabled={isPending}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Simple confirmation for regular assets
  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm text-destructive font-medium">Are you sure?</span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting..." : "Yes, Delete"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
