"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bulkUpdateTranscripts, bulkDeleteTranscripts } from "@/lib/actions";

type TranscriptWithAsset = {
  transcript: {
    id: string;
    mediaAssetId: string | null;
    canonicalAssetId: string | null;
    language: string;
    kind: string;
    spokenSource: string | null;
    spokenLanguage: string | null;
    translationOf: string | null;
    timecodeStatus: string | null;
    source: string | null;
    publicationStatus: string;
    version: number;
    createdBy: string | null;
    editedBy: string | null;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  mediaAsset: {
    id: string;
    name: string | null;
    title: string | null;
    assetType: string | null;
    duration: string | null;
  } | null;
};

type TranscriptsPageClientProps = {
  transcripts: TranscriptWithAsset[];
  totalCount: number;
  currentPage: number;
  totalPages: number;
  languages: string[];
  kinds: string[];
  statuses: string[];
  timecodes: string[];
  sources: string[];
  searchParams: Record<string, string | undefined>;
};

const PUBLICATION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  in_review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  published: "bg-purple-100 text-purple-700",
  needs_work: "bg-orange-100 text-orange-700",
  archived: "bg-slate-100 text-slate-700",
};

const LANGUAGE_LABELS: Record<string, string> = {
  bo: "Tibetan",
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  de: "German",
  vi: "Vietnamese",
  fr: "French",
  pt: "Portuguese",
  multi: "Multi",
};

export function TranscriptsPageClient({
  transcripts,
  totalCount,
  currentPage,
  totalPages,
  languages,
  kinds,
  statuses,
  timecodes,
  sources,
  searchParams,
}: TranscriptsPageClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v && k !== "page") params.set(k, v);
    });
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page"); // Reset to first page on filter change
    router.push(`/transcripts?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([k, v]) => {
      if (v) params.set(k, v);
    });
    params.set("page", newPage.toString());
    router.push(`/transcripts?${params.toString()}`);
  };

  const handleSelectAll = () => {
    if (selectedIds.length === transcripts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transcripts.map((t) => t.transcript.id));
    }
  };

  const handleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedIds.length === 0) return;
    setIsSubmitting(true);
    try {
      await bulkUpdateTranscripts({
        transcriptIds: selectedIds,
        updates: { status: newStatus },
      });
      setSelectedIds([]);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Delete ${selectedIds.length} transcript(s)?`)) return;
    setIsSubmitting(true);
    try {
      await bulkDeleteTranscripts(selectedIds);
      setSelectedIds([]);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="rounded-lg border p-4 bg-muted/30">
        <form className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="text-xs font-medium mb-1 block">Search</label>
            <Input
              name="search"
              placeholder="Search by asset name..."
              defaultValue={searchParams.search || ""}
              onBlur={(e) => handleFilterChange("search", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleFilterChange("search", e.currentTarget.value);
                }
              }}
            />
          </div>

          {/* Language */}
          <div>
            <label className="text-xs font-medium mb-1 block">Language</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={searchParams.language || ""}
              onChange={(e) => handleFilterChange("language", e.target.value)}
            >
              <option value="">All</option>
              {languages.map((lang) => (
                <option key={lang} value={lang}>
                  {LANGUAGE_LABELS[lang] || lang}
                </option>
              ))}
            </select>
          </div>

          {/* Kind */}
          <div>
            <label className="text-xs font-medium mb-1 block">Kind</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={searchParams.kind || ""}
              onChange={(e) => handleFilterChange("kind", e.target.value)}
            >
              <option value="">All</option>
              {kinds.map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </div>

          {/* Publication Status */}
          <div>
            <label className="text-xs font-medium mb-1 block">Publication Status</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={searchParams.publicationStatus || ""}
              onChange={(e) => handleFilterChange("publicationStatus", e.target.value)}
            >
              <option value="">All</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Timecode */}
          <div>
            <label className="text-xs font-medium mb-1 block">Timecode</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={searchParams.timecode || ""}
              onChange={(e) => handleFilterChange("timecode", e.target.value)}
            >
              <option value="">All</option>
              {timecodes.map((tc) => (
                <option key={tc} value={tc}>
                  {tc}
                </option>
              ))}
            </select>
          </div>

          {/* Source */}
          <div>
            <label className="text-xs font-medium mb-1 block">Source</label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={searchParams.source || ""}
              onChange={(e) => handleFilterChange("source", e.target.value)}
            >
              <option value="">All</option>
              {sources.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </div>
        </form>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-blue-900">
                {selectedIds.length} selected
              </span>
              <button
                onClick={() => setSelectedIds([])}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear
              </button>
            </div>
            <div className="flex gap-2">
              <select
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(e) => {
                  if (e.target.value) handleBulkStatusUpdate(e.target.value);
                  e.target.value = "";
                }}
                disabled={isSubmitting}
              >
                <option value="">Set Status...</option>
                <option value="draft">Draft</option>
                <option value="in_review">In Review</option>
                <option value="approved">Approved</option>
                <option value="published">Published</option>
                <option value="needs_work">Needs Work</option>
                <option value="archived">Archived</option>
              </select>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isSubmitting}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  checked={selectedIds.length === transcripts.length && transcripts.length > 0}
                  onChange={handleSelectAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">Media Asset</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Language</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Kind</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Timecode</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Source</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Version</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {transcripts.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                  No transcripts found
                </td>
              </tr>
            ) : (
              transcripts.map(({ transcript, mediaAsset }) => (
                <tr key={transcript.id} className="hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(transcript.id)}
                      onChange={() => handleSelect(transcript.id)}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/transcripts/${transcript.id}`}
                      className="text-sm font-medium text-blue-600 hover:underline"
                    >
                      {mediaAsset?.title || mediaAsset?.name || "Unknown Asset"}
                    </Link>
                    {mediaAsset?.assetType && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        ({mediaAsset.assetType})
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {LANGUAGE_LABELS[transcript.language] || transcript.language}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">{transcript.kind}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        PUBLICATION_STATUS_COLORS[transcript.publicationStatus] || "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {transcript.publicationStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">
                    {transcript.timecodeStatus || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm capitalize">
                    {transcript.source || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm">v{transcript.version}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(transcript.updatedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
