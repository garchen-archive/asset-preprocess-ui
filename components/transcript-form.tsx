"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/searchable-select";
import { AsyncSearchableSelect } from "@/components/async-searchable-select";
import { createTranscript, updateTranscript } from "@/lib/actions";

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
  { value: "", label: "Not specified" },
  { value: "teacher", label: "Teacher" },
  { value: "interpreter", label: "Interpreter" },
  { value: "mixed", label: "Mixed" },
  { value: "unknown", label: "Unknown" },
];

const TIMECODE_OPTIONS = [
  { value: "none", label: "None" },
  { value: "partial", label: "Partial" },
  { value: "full", label: "Full" },
];

const SOURCE_OPTIONS = [
  { value: "", label: "Not specified" },
  { value: "asr", label: "ASR (Automatic)" },
  { value: "human", label: "Human" },
  { value: "hybrid", label: "Hybrid" },
];

const PUBLICATION_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "needs_work", label: "Needs Work" },
  { value: "archived", label: "Archived" },
];

type EventSessionOption = {
  id: string;
  sessionName: string;
  eventName?: string | null;
};

type EventSessionAssetOption = {
  id: string;
  eventSessionId: string;
  assetId: string;
  assetName: string | null;
  assetTitle: string | null;
  variantType: string;
  variantLabel: string | null;
};

type TranscriptData = {
  id: string;
  mediaAssetId: string | null;
  canonicalAssetId: string | null;
  eventSessionId: string | null;
  eventSessionAssetId: string | null;
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
  updatedAt: Date;
};

interface TranscriptFormProps {
  mode: "create" | "edit";
  transcript?: TranscriptData;
  eventSessions?: EventSessionOption[];
  eventSessionAssets?: EventSessionAssetOption[];
  // For displaying initially selected assets (edit mode)
  initialMediaAsset?: { id: string; name: string | null; title: string | null; assetType: string | null } | null;
  initialCanonicalAsset?: { id: string; name: string | null; title: string | null; assetType: string | null; fileFormat: string | null } | null;
  defaultMediaAssetId?: string;
  defaultCanonicalAssetId?: string;
  cancelHref: string;
}

export function TranscriptForm({
  mode,
  transcript,
  eventSessions = [],
  eventSessionAssets = [],
  initialMediaAsset,
  initialCanonicalAsset,
  defaultMediaAssetId,
  defaultCanonicalAssetId,
  cancelHref,
}: TranscriptFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false); // Ref for synchronous double-submit prevention

  // Form state
  const [mediaAssetId, setMediaAssetId] = useState(
    transcript?.mediaAssetId || defaultMediaAssetId || ""
  );
  const [canonicalAssetId, setCanonicalAssetId] = useState(
    transcript?.canonicalAssetId || defaultCanonicalAssetId || ""
  );
  const [eventSessionId, setEventSessionId] = useState(
    transcript?.eventSessionId || ""
  );
  const [eventSessionAssetId, setEventSessionAssetId] = useState(
    transcript?.eventSessionAssetId || ""
  );
  const [language, setLanguage] = useState(transcript?.language || "en");
  const [kind, setKind] = useState(transcript?.kind || "transcript");
  const [spokenSource, setSpokenSource] = useState(transcript?.spokenSource || "");
  const [spokenLanguage, setSpokenLanguage] = useState(transcript?.spokenLanguage || "");
  const [translationOf, setTranslationOf] = useState(transcript?.translationOf || "");
  const [timecodeStatus, setTimecodeStatus] = useState(transcript?.timecodeStatus || "none");
  const [source, setSource] = useState(transcript?.source || "");
  const [publicationStatus, setPublicationStatus] = useState(transcript?.publicationStatus || "draft");
  const [editedBy, setEditedBy] = useState(transcript?.editedBy || "");
  const [createdBy, setCreatedBy] = useState(transcript?.createdBy || "");
  const [notes, setNotes] = useState(transcript?.notes || "");
  const [changeNote, setChangeNote] = useState("");

  // Initial options for async selects (for displaying currently selected values)
  const initialMediaOption = initialMediaAsset
    ? { value: initialMediaAsset.id, label: `${initialMediaAsset.title || initialMediaAsset.name} (${initialMediaAsset.assetType})` }
    : null;

  const initialCanonicalOption = initialCanonicalAsset
    ? { value: initialCanonicalAsset.id, label: `${initialCanonicalAsset.title || initialCanonicalAsset.name} (${initialCanonicalAsset.fileFormat || initialCanonicalAsset.assetType})` }
    : null;

  const eventSessionOptions = eventSessions.map((session) => ({
    value: session.id,
    label: session.eventName
      ? `${session.sessionName} (${session.eventName})`
      : session.sessionName,
  }));

  // Filter session assets based on selected session
  const filteredSessionAssets = eventSessionAssets
    .filter((sa) => sa.eventSessionId === eventSessionId)
    .map((sa) => ({
      value: sa.id,
      label: `${sa.assetTitle || sa.assetName || "Unknown"} - ${sa.variantLabel || sa.variantType}`,
    }));

  // Handle session change - clear session asset when session changes
  const handleSessionChange = (newSessionId: string) => {
    setEventSessionId(newSessionId);
    // Clear session asset if it doesn't belong to the new session
    if (newSessionId !== eventSessionId) {
      setEventSessionAssetId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Prevent double submission using ref (synchronous check)
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("mediaAssetId", mediaAssetId);
    formData.set("canonicalAssetId", canonicalAssetId);
    formData.set("eventSessionId", eventSessionId);
    formData.set("eventSessionAssetId", eventSessionAssetId);
    formData.set("language", language);
    formData.set("kind", kind);
    formData.set("spokenSource", spokenSource);
    formData.set("spokenLanguage", spokenLanguage);
    formData.set("translationOf", translationOf);
    formData.set("timecodeStatus", timecodeStatus);
    formData.set("source", source);
    formData.set("publicationStatus", publicationStatus);
    formData.set("notes", notes);

    if (mode === "create") {
      formData.set("createdBy", createdBy);
      const result = await createTranscript(formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        submittingRef.current = false; // Allow retry on error
        return;
      }
    } else if (transcript) {
      formData.set("editedBy", editedBy);
      formData.set("changeNote", changeNote);
      await updateTranscript(transcript.id, formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Session Association */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Session</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="eventSessionId">Event Session</Label>
            <SearchableSelect
              options={eventSessionOptions}
              value={eventSessionId}
              onChange={handleSessionChange}
              placeholder="Search event sessions..."
              name="eventSessionId"
              emptyLabel="Select session..."
            />
<p className="text-xs text-muted-foreground mt-1">
              Optional. The event session this transcript belongs to.
            </p>
          </div>

          {/* Event Session Asset - only shown when session is selected and has assets */}
          {eventSessionId && filteredSessionAssets.length > 0 && (
            <div>
              <Label htmlFor="eventSessionAssetId">Event Session Asset</Label>
              <SearchableSelect
                options={filteredSessionAssets}
                value={eventSessionAssetId}
                onChange={setEventSessionAssetId}
                placeholder="Select specific variant..."
                name="eventSessionAssetId"
                emptyLabel="None (applies to all variants)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Optional. Select if this transcript aligns to a specific variant (e.g., Camera A, edited cut).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Assets */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Assets</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="canonicalAssetId">Canonical Asset</Label>
            <AsyncSearchableSelect
              searchEndpoint="/api/search/assets?type=transcript"
              value={canonicalAssetId}
              onChange={setCanonicalAssetId}
              placeholder="Type to search transcript files..."
              name="canonicalAssetId"
              emptyLabel="None"
              initialOption={initialCanonicalOption}
              minChars={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              The subtitle or document asset containing the transcript text (SRT, VTT, TXT, DOCX, etc.).
            </p>
          </div>

          <div>
            <Label htmlFor="mediaAssetId">Media Asset</Label>
            <AsyncSearchableSelect
              searchEndpoint="/api/search/assets?type=media"
              value={mediaAssetId}
              onChange={setMediaAssetId}
              placeholder="Type to search media assets..."
              name="mediaAssetId"
              emptyLabel="None"
              initialOption={initialMediaOption}
              minChars={2}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Optional. Only populate when transcript timing is aligned to a specific file variant
              (e.g., ASR generated from Camera A only, or timing drift exists between variants).
            </p>
          </div>
        </div>
      </div>

      {/* Language & Type */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Language & Type</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="language">Language *</Label>
            <select
              id="language"
              name="language"
              required
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="kind">Kind *</Label>
            <select
              id="kind"
              name="kind"
              required
              value={kind}
              onChange={(e) => setKind(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {KIND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="spokenSource">Spoken Source</Label>
            <select
              id="spokenSource"
              name="spokenSource"
              value={spokenSource}
              onChange={(e) => setSpokenSource(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {SPOKEN_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {mode === "create" && (
              <p className="text-xs text-muted-foreground mt-1">
                Who is speaking in the audio being transcribed.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="spokenLanguage">Spoken Language</Label>
            <select
              id="spokenLanguage"
              name="spokenLanguage"
              value={spokenLanguage}
              onChange={(e) => setSpokenLanguage(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">Not specified</option>
              {LANGUAGE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="translationOf">Translation Of</Label>
            <select
              id="translationOf"
              name="translationOf"
              value={translationOf}
              onChange={(e) => setTranslationOf(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {SPOKEN_SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {mode === "create" && (
              <p className="text-xs text-muted-foreground mt-1">
                When kind is &quot;translation&quot;, whose speech is being translated.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Technical Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="timecodeStatus">Timecode Status</Label>
            <select
              id="timecodeStatus"
              name="timecodeStatus"
              value={timecodeStatus}
              onChange={(e) => setTimecodeStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {TIMECODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="source">Source</Label>
            <select
              id="source"
              name="source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            {mode === "create" && (
              <p className="text-xs text-muted-foreground mt-1">
                How the transcript was created.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Workflow */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Workflow</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="publicationStatus">{mode === "create" ? "Initial Status" : "Publication Status *"}</Label>
            <select
              id="publicationStatus"
              name="publicationStatus"
              required={mode === "edit"}
              value={publicationStatus}
              onChange={(e) => setPublicationStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {PUBLICATION_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor={mode === "create" ? "createdBy" : "editedBy"}>
              {mode === "create" ? "Created By" : "Edited By"}
            </Label>
            <Input
              id={mode === "create" ? "createdBy" : "editedBy"}
              name={mode === "create" ? "createdBy" : "editedBy"}
              placeholder="Your name or email"
              value={mode === "create" ? createdBy : editedBy}
              onChange={(e) =>
                mode === "create"
                  ? setCreatedBy(e.target.value)
                  : setEditedBy(e.target.value)
              }
            />
          </div>

          {mode === "edit" && (
            <div className="md:col-span-2">
              <Label htmlFor="changeNote">Change Note</Label>
              <Input
                id="changeNote"
                name="changeNote"
                placeholder="Brief description of changes (for revision history)"
                value={changeNote}
                onChange={(e) => setChangeNote(e.target.value)}
              />
            </div>
          )}

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Additional notes about this transcript..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create Transcript"
            : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
