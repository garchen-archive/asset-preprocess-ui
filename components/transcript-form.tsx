"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SearchableSelect } from "@/components/searchable-select";
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

const STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "reviewed", label: "Reviewed" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
];

type MediaAsset = {
  id: string;
  name: string | null;
  title: string | null;
  assetType: string | null;
};

type TranscriptAsset = {
  id: string;
  name: string | null;
  title: string | null;
  assetType: string | null;
  fileFormat: string | null;
};

type TranscriptData = {
  id: string;
  mediaAssetId: string;
  canonicalAssetId: string | null;
  language: string;
  kind: string;
  spokenSource: string | null;
  spokenLanguage: string | null;
  translationOf: string | null;
  timecodeStatus: string | null;
  source: string | null;
  status: string;
  version: number;
  createdBy: string | null;
  editedBy: string | null;
  notes: string | null;
  updatedAt: Date;
};

interface TranscriptFormProps {
  mode: "create" | "edit";
  transcript?: TranscriptData;
  mediaAssets: MediaAsset[];
  transcriptAssets: TranscriptAsset[];
  linkedMediaAsset?: MediaAsset | null;
  defaultMediaAssetId?: string;
  cancelHref: string;
}

export function TranscriptForm({
  mode,
  transcript,
  mediaAssets,
  transcriptAssets,
  linkedMediaAsset,
  defaultMediaAssetId,
  cancelHref,
}: TranscriptFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [mediaAssetId, setMediaAssetId] = useState(
    transcript?.mediaAssetId || defaultMediaAssetId || ""
  );
  const [canonicalAssetId, setCanonicalAssetId] = useState(
    transcript?.canonicalAssetId || ""
  );
  const [language, setLanguage] = useState(transcript?.language || "en");
  const [kind, setKind] = useState(transcript?.kind || "transcript");
  const [spokenSource, setSpokenSource] = useState(transcript?.spokenSource || "");
  const [spokenLanguage, setSpokenLanguage] = useState(transcript?.spokenLanguage || "");
  const [translationOf, setTranslationOf] = useState(transcript?.translationOf || "");
  const [timecodeStatus, setTimecodeStatus] = useState(transcript?.timecodeStatus || "none");
  const [source, setSource] = useState(transcript?.source || "");
  const [status, setStatus] = useState(transcript?.status || "draft");
  const [editedBy, setEditedBy] = useState(transcript?.editedBy || "");
  const [createdBy, setCreatedBy] = useState(transcript?.createdBy || "");
  const [notes, setNotes] = useState(transcript?.notes || "");
  const [changeNote, setChangeNote] = useState("");

  // Convert assets to searchable options
  const mediaAssetOptions = mediaAssets.map((asset) => ({
    value: asset.id,
    label: `${asset.title || asset.name} (${asset.assetType})`,
  }));

  const transcriptAssetOptions = transcriptAssets.map((asset) => ({
    value: asset.id,
    label: `${asset.title || asset.name} (${asset.fileFormat || asset.assetType})`,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const formData = new FormData();
    formData.set("mediaAssetId", mediaAssetId);
    formData.set("canonicalAssetId", canonicalAssetId);
    formData.set("language", language);
    formData.set("kind", kind);
    formData.set("spokenSource", spokenSource);
    formData.set("spokenLanguage", spokenLanguage);
    formData.set("translationOf", translationOf);
    formData.set("timecodeStatus", timecodeStatus);
    formData.set("source", source);
    formData.set("status", status);
    formData.set("notes", notes);

    if (mode === "create") {
      formData.set("createdBy", createdBy);
      await createTranscript(formData);
    } else if (transcript) {
      formData.set("editedBy", editedBy);
      formData.set("changeNote", changeNote);
      await updateTranscript(transcript.id, formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Media Asset Selection */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Media Asset</h2>
        <div className="space-y-4">
          {mode === "edit" && linkedMediaAsset ? (
            <div>
              <Label className="text-muted-foreground">Linked Media Asset</Label>
              <p className="text-sm font-medium">
                <Link
                  href={`/assets/${linkedMediaAsset.id}`}
                  className="text-blue-600 hover:underline"
                >
                  {linkedMediaAsset.title || linkedMediaAsset.name} ({linkedMediaAsset.assetType})
                </Link>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Media asset cannot be changed after creation.
              </p>
              <input type="hidden" name="mediaAssetId" value={mediaAssetId} />
            </div>
          ) : (
            <div>
              <Label htmlFor="mediaAssetId">Media Asset (Video/Audio) *</Label>
              <SearchableSelect
                options={mediaAssetOptions}
                value={mediaAssetId}
                onChange={setMediaAssetId}
                placeholder="Search media assets..."
                name="mediaAssetId"
                emptyLabel="Select media asset..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                The video or audio asset this transcript is for.
              </p>
            </div>
          )}

          <div>
            <Label htmlFor="canonicalAssetId">Transcript File (Optional)</Label>
            <SearchableSelect
              options={transcriptAssetOptions}
              value={canonicalAssetId}
              onChange={setCanonicalAssetId}
              placeholder="Search transcript files..."
              name="canonicalAssetId"
              emptyLabel="No file linked"
            />
            <p className="text-xs text-muted-foreground mt-1">
              The SRT, VTT, or document file containing the transcript text.
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
            <Label htmlFor="status">{mode === "create" ? "Initial Status" : "Status *"}</Label>
            <select
              id="status"
              name="status"
              required={mode === "edit"}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {STATUS_OPTIONS.map((opt) => (
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
