"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { createTranscript } from "@/lib/actions";

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

export interface SessionAsset {
  linkId: string;
  assetId: string;
  assetName: string | null;
  variantType: string;
  variantLabel: string | null;
}

export interface TranscriptQuickAddProps {
  // For asset page: fixed media asset ID
  mediaAssetId?: string;
  // For session page: session linking and target asset selection
  sessionId?: string;
  sessionAssets?: SessionAsset[];
  canonicalAsset?: SessionAsset;
  // For duplicate detection (session page)
  existingCombinations?: string[];
  onSuccess: () => void;
  onCancel: () => void;
}

export function TranscriptQuickAdd({
  mediaAssetId,
  sessionId,
  sessionAssets,
  canonicalAsset,
  existingCombinations = [],
  onSuccess,
  onCancel,
}: TranscriptQuickAddProps) {
  // Determine mode: session (with target dropdown) or asset (fixed media asset)
  const isSessionMode = !!sessionAssets && sessionAssets.length > 0;

  // Current target asset selection (for session mode)
  const [currentMediaAssetId, setCurrentMediaAssetId] = useState(
    canonicalAsset?.assetId || mediaAssetId || ""
  );

  const [rows, setRows] = useState<TranscriptRow[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCount, setCreatedCount] = useState(0);
  const { toast } = useToast();

  // Multi-select search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Get current target asset name (for session mode)
  const currentTargetAsset = sessionAssets?.find(a => a.assetId === currentMediaAssetId);

  // Effective media asset ID (from dropdown or prop)
  const effectiveMediaAssetId = isSessionMode ? currentMediaAssetId : mediaAssetId;
  const effectiveMediaAssetName = isSessionMode
    ? (currentTargetAsset?.assetName || "No target")
    : "Current asset";

  // Search for transcript files
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (searchQuery.length < 2) {
      setSearchResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const response = await fetch(`/api/search/assets?type=transcript&q=${encodeURIComponent(searchQuery)}`);
        if (response.ok) {
          const data = await response.json();
          setSearchResults(data.map((item: any) => ({
            id: item.id,
            label: `${item.title || item.name} (${item.fileFormat || item.assetType})`,
          })));
        }
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchQuery]);

  // Toggle selection of a search result
  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Guess language from filename
  const guessLanguageFromFilename = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes("_bo") || lower.includes("-bo") || lower.includes("tibetan")) return "bo";
    if (lower.includes("_zh") || lower.includes("-zh") || lower.includes("chinese")) return "zh";
    if (lower.includes("_es") || lower.includes("-es") || lower.includes("spanish")) return "es";
    if (lower.includes("_de") || lower.includes("-de") || lower.includes("german")) return "de";
    if (lower.includes("_vi") || lower.includes("-vi") || lower.includes("vietnam")) return "vi";
    if (lower.includes("_fr") || lower.includes("-fr") || lower.includes("french")) return "fr";
    if (lower.includes("_pt") || lower.includes("-pt") || lower.includes("portug")) return "pt";
    return "en";
  };

  // Guess kind from filename
  const guessKindFromFilename = (filename: string): string => {
    const lower = filename.toLowerCase();
    if (lower.includes("translat")) return "translation";
    return "transcript";
  };

  // Add all selected files to rows
  const addSelectedFiles = () => {
    if (!effectiveMediaAssetId) {
      toast({
        title: "No target selected",
        description: "Please select a target asset first.",
        variant: "destructive",
      });
      return;
    }

    const existingIds = new Set(rows.map(r => r.canonicalAssetId));
    let addedCount = 0;

    selectedIds.forEach(id => {
      if (existingIds.has(id)) return;

      const result = searchResults.find(r => r.id === id);
      if (!result) return;

      const newRow: TranscriptRow = {
        id: crypto.randomUUID(),
        canonicalAssetId: result.id,
        canonicalAssetName: result.label,
        mediaAssetId: effectiveMediaAssetId,
        mediaAssetName: effectiveMediaAssetName,
        language: guessLanguageFromFilename(result.label),
        kind: guessKindFromFilename(result.label),
        spokenSource: "teacher",
        stage: "approved",
      };
      setRows(prev => [...prev, newRow]);
      addedCount++;
    });

    if (addedCount > 0) {
      toast({
        title: `${addedCount} file${addedCount > 1 ? "s" : ""} added`,
        description: "Review and adjust settings below, then create transcripts.",
      });
    }

    setSelectedIds(new Set());
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

  // Check if a row would create a duplicate (same target asset + language + kind + spokenSource)
  const isDuplicate = (row: TranscriptRow) => {
    if (existingCombinations.length === 0) return false;
    const key = `${row.mediaAssetId || ""}-${row.language}-${row.kind}-${row.spokenSource}`;
    return existingCombinations.includes(key);
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
        if (sessionId) {
          formData.set("eventSessionId", sessionId);
        }
        formData.set("mediaAssetId", row.mediaAssetId);
        formData.set("canonicalAssetId", row.canonicalAssetId);
        formData.set("language", row.language);
        formData.set("kind", row.kind);
        formData.set("spokenSource", row.spokenSource);
        formData.set("stage", row.stage);
        formData.set("timecodeStatus", "full");
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
          : isSessionMode
            ? "Transcripts have been linked to this session."
            : "Transcripts have been linked to this asset.",
      });
      onSuccess();
    } else {
      setError(lastError || "Failed to create transcripts");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border rounded-lg p-4 bg-muted/30 mb-4">
      {error && (
        <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Target Asset + Search row */}
        <div className="flex gap-3 items-end">
          {/* Target Asset dropdown - only in session mode */}
          {isSessionMode && (
            <div className="w-1/3">
              <label className="text-xs font-medium text-muted-foreground mb-1 block">
                Target Asset
              </label>
              <select
                value={currentMediaAssetId}
                onChange={(e) => setCurrentMediaAssetId(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">None</option>
                {sessionAssets?.map((asset) => (
                  <option key={asset.assetId} value={asset.assetId}>
                    {asset.assetName || "Unnamed"}
                    {asset.linkId === canonicalAsset?.linkId ? " (canonical)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search input */}
          <div className="flex-1">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Search SRT/VTT Files
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type to search (select multiple)..."
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {selectedIds.size > 0 && (
            <Button
              type="button"
              size="sm"
              onClick={addSelectedFiles}
              className="h-10"
            >
              Add {selectedIds.size} Selected
            </Button>
          )}
        </div>

        {/* Search Results with checkboxes */}
        {(searchResults.length > 0 || isSearching) && (
          <div className="border rounded-lg max-h-48 overflow-y-auto bg-white">
            {isSearching ? (
              <div className="p-3 text-sm text-muted-foreground">Searching...</div>
            ) : (
              <div className="divide-y">
                {searchResults.map((result) => {
                  const isSelected = selectedIds.has(result.id);
                  const isAlreadyAdded = rows.some(r => r.canonicalAssetId === result.id);

                  return (
                    <label
                      key={result.id}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50 ${
                        isAlreadyAdded ? "opacity-50" : ""
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => !isAlreadyAdded && toggleSelection(result.id)}
                        disabled={isAlreadyAdded}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <span className="text-sm flex-1">{result.label}</span>
                      {isAlreadyAdded && (
                        <span className="text-xs text-muted-foreground">Added</span>
                      )}
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="text-xs text-muted-foreground">Type at least 2 characters to search</p>
        )}

        {/* List of files to create transcripts for */}
        {rows.length > 0 && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">
              Transcripts to create ({rows.length})
            </label>
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
                    {/* Target: Filename (session mode shows target, asset mode just shows filename) */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs truncate">
                        {isSessionMode && (
                          <>
                            <span className="font-medium">{row.mediaAssetName}:</span>{" "}
                          </>
                        )}
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
          <p className="text-sm text-muted-foreground text-center py-4 border rounded-lg bg-white">
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
              {isSubmitting ? "Creating..." : `Create ${rows.length > 0 ? rows.length : ""} Transcript${rows.length !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
