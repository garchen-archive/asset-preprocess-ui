"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { AsyncSearchableSelect } from "@/components/async-searchable-select";
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

interface TranscriptQuickAddProps {
  mediaAssetId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TranscriptQuickAdd({
  mediaAssetId,
  onSuccess,
  onCancel,
}: TranscriptQuickAddProps) {
  const [canonicalAssetId, setCanonicalAssetId] = useState("");
  const [language, setLanguage] = useState("en");
  const [kind, setKind] = useState("transcript");
  const [spokenSource, setSpokenSource] = useState("teacher");
  const [stage, setStage] = useState("approved");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.set("mediaAssetId", mediaAssetId);
      formData.set("canonicalAssetId", canonicalAssetId);
      formData.set("language", language);
      formData.set("kind", kind);
      formData.set("spokenSource", spokenSource);
      formData.set("stage", stage);
      formData.set("timecodeStatus", canonicalAssetId ? "full" : "none");
      formData.set("publicationStatus", "draft");
      formData.set("skipRedirect", "true"); // Stay on asset page after creation

      const result = await createTranscript(formData);

      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      toast({
        title: "Transcript created",
        description: "The transcript has been linked to this asset.",
      });

      onSuccess?.();
    } catch (err) {
      setError("Failed to create transcript");
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t pt-4 mt-4">
      <h3 className="text-sm font-semibold mb-3">Quick Add Transcript</h3>

      {error && (
        <div className="mb-3 p-2 rounded bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {/* Canonical Asset (SRT/VTT file) */}
        <div>
          <Label className="text-xs">Transcript File (SRT/VTT)</Label>
          <AsyncSearchableSelect
            searchEndpoint="/api/search/assets?type=transcript"
            value={canonicalAssetId}
            onChange={setCanonicalAssetId}
            placeholder="Search for SRT/VTT file..."
            name="canonicalAssetId"
            emptyLabel="None (create empty)"
            minChars={2}
          />
        </div>

        {/* Language, Kind, Speaker, Stage in a row */}
        <div className="grid grid-cols-4 gap-2">
          <div>
            <Label className="text-xs">Language</Label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Kind</Label>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Speaker</Label>
            <select
              value={spokenSource}
              onChange={(e) => setSpokenSource(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              {SPOKEN_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label className="text-xs">Stage</Label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
            >
              {STAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting ? "Creating..." : "Create Transcript"}
          </Button>
        </div>
      </div>
    </form>
  );
}
