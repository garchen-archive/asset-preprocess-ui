"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface BulkCreateTranscriptsProps {
  targetType: "session" | "event";
  targetId: string;
  targetName: string;
}

interface CreateResult {
  created: number;
  skipped: number;
  failed: number;
  details: Array<{
    session_id?: string;
    session_name?: string;
    asset_id?: string;
    language: string;
    transcript_id?: string;
    action: string;
    reason?: string;
  }>;
}

const COMMON_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "bo", name: "Tibetan" },
  { code: "zh", name: "Chinese" },
  { code: "es", name: "Spanish" },
  { code: "de", name: "German" },
  { code: "fr", name: "French" },
  { code: "pt", name: "Portuguese" },
  { code: "ru", name: "Russian" },
  { code: "vi", name: "Vietnamese" },
  { code: "id", name: "Indonesian" },
];

const TRANSCRIPT_KINDS = [
  { value: "subtitles", label: "Subtitles" },
  { value: "captions", label: "Captions" },
  { value: "transcript", label: "Transcript" },
];

export function BulkCreateTranscripts({
  targetType,
  targetId,
  targetName,
}: BulkCreateTranscriptsProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedLanguages, setSelectedLanguages] = useState<Set<string>>(new Set());
  const [kind, setKind] = useState("subtitles");
  const [skipExisting, setSkipExisting] = useState(true);
  const [result, setResult] = useState<CreateResult | null>(null);
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

  const handleOpen = () => {
    setOpen(true);
    setResult(null);
    setSelectedLanguages(new Set());
  };

  const toggleLanguage = (code: string) => {
    setSelectedLanguages((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const handleCreate = async () => {
    if (selectedLanguages.size === 0) return;

    setCreating(true);
    try {
      const endpoint = targetType === "session"
        ? `/api/v1/admin/sessions/${targetId}/bulk-create-transcripts`
        : `/api/v1/admin/events/${targetId}/bulk-create-transcripts`;

      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint,
          method: "POST",
          data: {
            languages: Array.from(selectedLanguages),
            kind,
            skip_existing: skipExisting,
          },
        }),
      });
      const data = await response.json();
      if (!response.ok || data.status >= 400) {
        throw new Error(data.error || data.data?.error || "Creation failed");
      }
      setResult(data.data);
      toast({
        title: "Transcripts created",
        description: `${data.data.created} transcript(s) created, ${data.data.skipped} skipped.`,
      });
    } catch (error) {
      toast({
        title: "Creation failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (result && result.created > 0) {
      router.refresh();
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={handleOpen}>
        Create Transcripts
      </Button>

      {/* Modal overlay */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div
            ref={modalRef}
            className="bg-background rounded-lg shadow-lg w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b">
              <h2 className="text-lg font-semibold">Create Transcripts</h2>
              <p className="text-sm text-muted-foreground">
                Create transcript records for {targetType === "event" ? "all sessions in " : ""}
                &quot;{targetName}&quot;
              </p>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {result ? (
                // Show result
                <div className="space-y-4">
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <h4 className="font-semibold mb-2">Results</h4>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Created:</span>{" "}
                        <span className="font-medium text-green-600">{result.created}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Skipped:</span>{" "}
                        <span className="font-medium">{result.skipped}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Failed:</span>{" "}
                        <span className="font-medium text-red-600">{result.failed}</span>
                      </div>
                    </div>
                    {result.details.length > 0 && (
                      <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
                        {result.details.map((d, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs">
                            {d.action === "created" ? (
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                            ) : d.action === "failed" ? (
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                            ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-300" />
                            )}
                            <span className="flex-1 truncate">
                              {d.session_name && `${d.session_name} - `}
                              {d.language.toUpperCase()}
                            </span>
                            <span className="text-muted-foreground">{d.reason || d.action}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Show form
                <div className="space-y-4">
                  {/* Language selection */}
                  <div>
                    <h4 className="font-semibold mb-2">Languages</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      Select languages to create transcript records for
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {COMMON_LANGUAGES.map((lang) => (
                        <label
                          key={lang.code}
                          className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50"
                        >
                          <input
                            type="checkbox"
                            checked={selectedLanguages.has(lang.code)}
                            onChange={() => toggleLanguage(lang.code)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm">
                            {lang.name} ({lang.code})
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Kind selection */}
                  <div>
                    <h4 className="font-semibold mb-2">Type</h4>
                    <div className="flex gap-2">
                      {TRANSCRIPT_KINDS.map((k) => (
                        <label
                          key={k.value}
                          className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer ${
                            kind === k.value ? "border-blue-500 bg-blue-50" : "hover:bg-muted/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name="kind"
                            value={k.value}
                            checked={kind === k.value}
                            onChange={(e) => setKind(e.target.value)}
                            className="sr-only"
                          />
                          <span className="text-sm">{k.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Options */}
                  <div className="pt-2 border-t">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={skipExisting}
                        onChange={(e) => setSkipExisting(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                      <div className="text-sm">
                        <span>Skip existing transcripts</span>
                        <p className="text-xs text-muted-foreground">
                          Don&apos;t create if a transcript already exists for the language
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t flex justify-end gap-2">
              {result ? (
                <Button onClick={handleClose}>Close</Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => setOpen(false)} disabled={creating}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={creating || selectedLanguages.size === 0}
                  >
                    {creating ? (
                      <>
                        <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating...
                      </>
                    ) : (
                      `Create ${selectedLanguages.size} Transcript${selectedLanguages.size !== 1 ? "s" : ""}`
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
