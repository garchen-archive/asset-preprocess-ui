"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SubtitleCue {
  index: number;
  startTime: string;
  endTime: string;
  text: string;
}

interface SubtitleViewerProps {
  assetId?: string | null;
  format?: string | null;
  className?: string;
}

export function SubtitleViewer({
  assetId,
  format,
  className = "",
}: SubtitleViewerProps) {
  const [content, setContent] = useState<string | null>(null);
  const [cues, setCues] = useState<SubtitleCue[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<"formatted" | "raw">("formatted");

  // Can fetch if we have an asset ID (pipeline API handles all storage providers)
  const canFetch = !!assetId;

  const fetchContent = async () => {
    if (!assetId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/storage/content?assetId=${encodeURIComponent(assetId)}`
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch content");
      }

      const data = await response.json();
      setContent(data.content);

      // Parse the subtitle content
      const parsedCues = parseSubtitles(data.content, data.format);
      setCues(parsedCues);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load content");
    } finally {
      setLoading(false);
    }
  };

  // Parse SRT or VTT content into cues
  function parseSubtitles(text: string, fileFormat: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];

    if (fileFormat === "vtt") {
      // VTT format
      const lines = text.split("\n");
      let i = 0;

      // Skip header
      while (i < lines.length && !lines[i].includes("-->")) {
        i++;
      }

      let index = 1;
      while (i < lines.length) {
        const line = lines[i].trim();

        if (line.includes("-->")) {
          const [startTime, endTime] = line.split("-->").map(t => t.trim());
          const textLines: string[] = [];

          i++;
          while (i < lines.length && lines[i].trim() !== "") {
            textLines.push(lines[i].trim());
            i++;
          }

          cues.push({
            index: index++,
            startTime: formatTimestamp(startTime),
            endTime: formatTimestamp(endTime),
            text: textLines.join("\n"),
          });
        }
        i++;
      }
    } else if (fileFormat === "srt") {
      // SRT format
      const blocks = text.split(/\n\n+/);

      for (const block of blocks) {
        const lines = block.trim().split("\n");
        if (lines.length < 3) continue;

        const indexLine = lines[0].trim();
        const timeLine = lines[1].trim();
        const textLines = lines.slice(2);

        if (!timeLine.includes("-->")) continue;

        const [startTime, endTime] = timeLine.split("-->").map(t => t.trim());

        cues.push({
          index: parseInt(indexLine, 10) || cues.length + 1,
          startTime: formatTimestamp(startTime),
          endTime: formatTimestamp(endTime),
          text: textLines.join("\n"),
        });
      }
    }

    return cues;
  }

  // Format timestamp for display (remove milliseconds for cleaner look)
  function formatTimestamp(ts: string): string {
    // Handle both SRT (00:00:00,000) and VTT (00:00:00.000) formats
    return ts.replace(",", ".").replace(/\.\d{3}$/, "");
  }

  // Determine why we can't fetch
  const getUnavailableReason = () => {
    if (!assetId) {
      return "No asset ID available for content preview";
    }
    return null;
  };

  const unavailableReason = getUnavailableReason();

  if (!canFetch) {
    return null;
  }

  if (!isExpanded) {
    return (
      <div className={className}>
        {canFetch ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setIsExpanded(true);
              if (!content) {
                fetchContent();
              }
            }}
          >
            View Subtitle Content
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            {unavailableReason}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${className}`}>
      <div className="flex items-center justify-between p-3 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">Subtitle Content</span>
          <span className="text-xs text-muted-foreground">
            {cues.length > 0 && `(${cues.length} cues)`}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border">
            <button
              className={`px-2 py-1 text-xs ${
                viewMode === "formatted"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => setViewMode("formatted")}
            >
              Formatted
            </button>
            <button
              className={`px-2 py-1 text-xs ${
                viewMode === "raw"
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              }`}
              onClick={() => setViewMode("raw")}
            >
              Raw
            </button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
          >
            Close
          </Button>
        </div>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <svg
              className="h-6 w-6 animate-spin text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        )}

        {error && (
          <div className="text-center py-8">
            <p className="text-sm text-red-600">{error}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2"
              onClick={fetchContent}
            >
              Retry
            </Button>
          </div>
        )}

        {!loading && !error && content && viewMode === "raw" && (
          <pre className="text-xs font-mono whitespace-pre-wrap break-words">
            {content}
          </pre>
        )}

        {!loading && !error && cues.length > 0 && viewMode === "formatted" && (
          <div className="space-y-3">
            {cues.map((cue) => (
              <div
                key={cue.index}
                className="flex gap-3 text-sm border-b pb-3 last:border-0"
              >
                <div className="flex-shrink-0 w-24 text-xs text-muted-foreground font-mono">
                  {cue.startTime}
                </div>
                <div className="flex-1 whitespace-pre-wrap">{cue.text}</div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && content && cues.length === 0 && viewMode === "formatted" && (
          <p className="text-sm text-muted-foreground">
            Could not parse subtitle cues. Switch to Raw view to see the content.
          </p>
        )}
      </div>
    </div>
  );
}
