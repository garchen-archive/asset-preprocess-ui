"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { bulkUpdateAssets } from "@/lib/actions";

interface BulkEditModalProps {
  selectedAssetIds: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const PROCESSING_STATUS_OPTIONS = [
  { value: "Raw", label: "Raw" },
  { value: "Ready_for_MVP", label: "Ready for MVP" },
  { value: "Needs_Work", label: "Needs Work" },
  { value: "In_Progress", label: "In Progress" },
  { value: "Complete", label: "Complete" },
  { value: "Published", label: "Published" },
];

const TRANSCRIPT_TIMESTAMPED_OPTIONS = [
  { value: "Yes", label: "Yes" },
  { value: "Partial", label: "Partial" },
  { value: "No", label: "No" },
];

const QUALITY_RATING_OPTIONS = [
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "unusable", label: "Unusable" },
];

const ASSET_TYPE_OPTIONS = [
  { value: "video", label: "Video" },
  { value: "audio", label: "Audio" },
  { value: "image", label: "Image" },
  { value: "document", label: "Document" },
  { value: "subtitle", label: "Subtitle" },
];

const TRANSCRIPT_LANGUAGE_OPTIONS = [
  "EN", "ZH", "Tibetan", "German", "Vietnamese", "French", "Spanish", "Portuguese", "Other"
];

const INTERPRETER_LANGUAGE_OPTIONS = [
  "English", "Chinese", "German", "Vietnamese", "French", "Spanish", "Portuguese"
];

export function BulkEditModal({
  selectedAssetIds,
  onClose,
  onSuccess,
}: BulkEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Track which fields are enabled for update
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});

  // Field values
  const [hasOralTranslation, setHasOralTranslation] = useState<boolean>(false);
  const [oralTranslationLanguages, setOralTranslationLanguages] = useState<string[]>([]);
  const [interpreterName, setInterpreterName] = useState("");
  const [contributorOrg, setContributorOrg] = useState("");
  const [processingStatus, setProcessingStatus] = useState("Raw");
  const [needsDetailedReview, setNeedsDetailedReview] = useState(false);
  const [transcriptAvailable, setTranscriptAvailable] = useState(false);
  const [transcriptTimestamped, setTranscriptTimestamped] = useState("No");
  const [transcriptLanguages, setTranscriptLanguages] = useState<string[]>([]);
  const [catalogingStatus, setCatalogingStatus] = useState("");
  const [exclude, setExclude] = useState(false);
  const [safeToDeleteFromGdrive, setSafeToDeleteFromGdrive] = useState(false);
  const [backedUpLocally, setBackedUpLocally] = useState(false);
  const [audioQuality, setAudioQuality] = useState("high");
  const [videoQuality, setVideoQuality] = useState("high");
  const [assetType, setAssetType] = useState("video");

  const toggleField = (field: string) => {
    setEnabledFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleLanguage = (lang: string, languages: string[], setLanguages: (langs: string[]) => void) => {
    if (languages.includes(lang)) {
      setLanguages(languages.filter((l) => l !== lang));
    } else {
      setLanguages([...languages, lang]);
    }
  };

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const updates: Record<string, unknown> = {};

      if (enabledFields.hasOralTranslation) updates.hasOralTranslation = hasOralTranslation;
      if (enabledFields.oralTranslationLanguages) updates.oralTranslationLanguages = oralTranslationLanguages.length > 0 ? oralTranslationLanguages : null;
      if (enabledFields.interpreterName) updates.interpreterName = interpreterName || null;
      if (enabledFields.contributorOrg) updates.contributorOrg = contributorOrg || null;
      if (enabledFields.processingStatus) updates.processingStatus = processingStatus;
      if (enabledFields.needsDetailedReview) updates.needsDetailedReview = needsDetailedReview;
      if (enabledFields.transcriptAvailable) updates.transcriptAvailable = transcriptAvailable;
      if (enabledFields.transcriptTimestamped) updates.transcriptTimestamped = transcriptTimestamped;
      if (enabledFields.transcriptLanguages) updates.transcriptLanguages = transcriptLanguages.length > 0 ? transcriptLanguages : null;
      if (enabledFields.catalogingStatus) updates.catalogingStatus = catalogingStatus || null;
      if (enabledFields.exclude) updates.exclude = exclude;
      if (enabledFields.safeToDeleteFromGdrive) updates.safeToDeleteFromGdrive = safeToDeleteFromGdrive;
      if (enabledFields.backedUpLocally) updates.backedUpLocally = backedUpLocally;
      if (enabledFields.audioQuality) updates.audioQuality = audioQuality;
      if (enabledFields.videoQuality) updates.videoQuality = videoQuality;
      if (enabledFields.assetType) updates.assetType = assetType;

      if (Object.keys(updates).length === 0) {
        setError("Please select at least one field to update");
        setIsSubmitting(false);
        return;
      }

      const result = await bulkUpdateAssets({
        assetIds: selectedAssetIds,
        updates,
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Failed to update assets");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const enabledCount = Object.values(enabledFields).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Bulk Edit Assets</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Editing {selectedAssetIds.length} asset{selectedAssetIds.length !== 1 ? "s" : ""}
            {enabledCount > 0 && ` • ${enabledCount} field${enabledCount !== 1 ? "s" : ""} selected`}
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-3">
              <div className="text-sm text-red-800">{error}</div>
            </div>
          )}

          {/* Instructions */}
          <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
            <div className="text-sm text-blue-800">
              <strong>Tip:</strong> Check the box next to each field you want to update. Only checked fields will be modified.
            </div>
          </div>

          {/* Classification Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Classification</h3>

            <FieldRow
              label="Asset Type"
              enabled={enabledFields.assetType}
              onToggle={() => toggleField("assetType")}
            >
              <select
                value={assetType}
                onChange={(e) => setAssetType(e.target.value)}
                disabled={!enabledFields.assetType}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {ASSET_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FieldRow>
          </div>

          {/* Interpreter Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Interpreter</h3>

            <FieldRow
              label="Has Oral Translation"
              enabled={enabledFields.hasOralTranslation}
              onToggle={() => toggleField("hasOralTranslation")}
            >
              <select
                value={hasOralTranslation ? "true" : "false"}
                onChange={(e) => setHasOralTranslation(e.target.value === "true")}
                disabled={!enabledFields.hasOralTranslation}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FieldRow>

            <FieldRow
              label="Interpreter Languages"
              enabled={enabledFields.oralTranslationLanguages}
              onToggle={() => toggleField("oralTranslationLanguages")}
            >
              <div className="flex flex-wrap gap-2">
                {INTERPRETER_LANGUAGE_OPTIONS.map((lang) => (
                  <label
                    key={lang}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-sm cursor-pointer ${
                      !enabledFields.oralTranslationLanguages ? "opacity-50" : ""
                    } ${oralTranslationLanguages.includes(lang) ? "bg-blue-100 border-blue-300" : "bg-gray-50 border-gray-200"}`}
                  >
                    <input
                      type="checkbox"
                      checked={oralTranslationLanguages.includes(lang)}
                      onChange={() => toggleLanguage(lang, oralTranslationLanguages, setOralTranslationLanguages)}
                      disabled={!enabledFields.oralTranslationLanguages}
                      className="h-3 w-3"
                    />
                    {lang}
                  </label>
                ))}
              </div>
            </FieldRow>

            <FieldRow
              label="Interpreter Name"
              enabled={enabledFields.interpreterName}
              onToggle={() => toggleField("interpreterName")}
            >
              <Input
                value={interpreterName}
                onChange={(e) => setInterpreterName(e.target.value)}
                disabled={!enabledFields.interpreterName}
                placeholder="Enter interpreter name..."
              />
            </FieldRow>
          </div>

          {/* Organization Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Organization</h3>

            <FieldRow
              label="Contributor Organization"
              enabled={enabledFields.contributorOrg}
              onToggle={() => toggleField("contributorOrg")}
            >
              <Input
                value={contributorOrg}
                onChange={(e) => setContributorOrg(e.target.value)}
                disabled={!enabledFields.contributorOrg}
                placeholder="Enter organization..."
              />
            </FieldRow>
          </div>

          {/* Processing Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Processing</h3>

            <FieldRow
              label="Processing Status"
              enabled={enabledFields.processingStatus}
              onToggle={() => toggleField("processingStatus")}
            >
              <select
                value={processingStatus}
                onChange={(e) => setProcessingStatus(e.target.value)}
                disabled={!enabledFields.processingStatus}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {PROCESSING_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FieldRow>

            <FieldRow
              label="Needs Detailed Review"
              enabled={enabledFields.needsDetailedReview}
              onToggle={() => toggleField("needsDetailedReview")}
            >
              <select
                value={needsDetailedReview ? "true" : "false"}
                onChange={(e) => setNeedsDetailedReview(e.target.value === "true")}
                disabled={!enabledFields.needsDetailedReview}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FieldRow>

            <FieldRow
              label="Cataloging Status"
              enabled={enabledFields.catalogingStatus}
              onToggle={() => toggleField("catalogingStatus")}
            >
              <Input
                value={catalogingStatus}
                onChange={(e) => setCatalogingStatus(e.target.value)}
                disabled={!enabledFields.catalogingStatus}
                placeholder="Enter cataloging status..."
              />
            </FieldRow>
          </div>

          {/* Quality Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Quality</h3>

            <FieldRow
              label="Audio Quality"
              enabled={enabledFields.audioQuality}
              onToggle={() => toggleField("audioQuality")}
            >
              <select
                value={audioQuality}
                onChange={(e) => setAudioQuality(e.target.value)}
                disabled={!enabledFields.audioQuality}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {QUALITY_RATING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FieldRow>

            <FieldRow
              label="Video Quality"
              enabled={enabledFields.videoQuality}
              onToggle={() => toggleField("videoQuality")}
            >
              <select
                value={videoQuality}
                onChange={(e) => setVideoQuality(e.target.value)}
                disabled={!enabledFields.videoQuality}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {QUALITY_RATING_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FieldRow>
          </div>

          {/* Transcript Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Transcripts</h3>

            <FieldRow
              label="Transcript Available"
              enabled={enabledFields.transcriptAvailable}
              onToggle={() => toggleField("transcriptAvailable")}
            >
              <select
                value={transcriptAvailable ? "true" : "false"}
                onChange={(e) => setTranscriptAvailable(e.target.value === "true")}
                disabled={!enabledFields.transcriptAvailable}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FieldRow>

            <FieldRow
              label="Transcript Timestamped"
              enabled={enabledFields.transcriptTimestamped}
              onToggle={() => toggleField("transcriptTimestamped")}
            >
              <select
                value={transcriptTimestamped}
                onChange={(e) => setTranscriptTimestamped(e.target.value)}
                disabled={!enabledFields.transcriptTimestamped}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {TRANSCRIPT_TIMESTAMPED_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FieldRow>

            <FieldRow
              label="Transcript Languages"
              enabled={enabledFields.transcriptLanguages}
              onToggle={() => toggleField("transcriptLanguages")}
            >
              <div className="flex flex-wrap gap-2">
                {TRANSCRIPT_LANGUAGE_OPTIONS.map((lang) => (
                  <label
                    key={lang}
                    className={`inline-flex items-center gap-1.5 px-2 py-1 rounded border text-sm cursor-pointer ${
                      !enabledFields.transcriptLanguages ? "opacity-50" : ""
                    } ${transcriptLanguages.includes(lang) ? "bg-blue-100 border-blue-300" : "bg-gray-50 border-gray-200"}`}
                  >
                    <input
                      type="checkbox"
                      checked={transcriptLanguages.includes(lang)}
                      onChange={() => toggleLanguage(lang, transcriptLanguages, setTranscriptLanguages)}
                      disabled={!enabledFields.transcriptLanguages}
                      className="h-3 w-3"
                    />
                    {lang}
                  </label>
                ))}
              </div>
            </FieldRow>
          </div>

          {/* Archive Status Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Archive Status</h3>

            <FieldRow
              label="Exclude from Archive"
              enabled={enabledFields.exclude}
              onToggle={() => toggleField("exclude")}
            >
              <select
                value={exclude ? "true" : "false"}
                onChange={(e) => setExclude(e.target.value === "true")}
                disabled={!enabledFields.exclude}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="true">Yes (Exclude)</option>
                <option value="false">No (Include)</option>
              </select>
            </FieldRow>

            <FieldRow
              label="Safe to Delete from GDrive"
              enabled={enabledFields.safeToDeleteFromGdrive}
              onToggle={() => toggleField("safeToDeleteFromGdrive")}
            >
              <select
                value={safeToDeleteFromGdrive ? "true" : "false"}
                onChange={(e) => setSafeToDeleteFromGdrive(e.target.value === "true")}
                disabled={!enabledFields.safeToDeleteFromGdrive}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FieldRow>

            <FieldRow
              label="Backed Up Locally"
              enabled={enabledFields.backedUpLocally}
              onToggle={() => toggleField("backedUpLocally")}
            >
              <select
                value={backedUpLocally ? "true" : "false"}
                onChange={(e) => setBackedUpLocally(e.target.value === "true")}
                disabled={!enabledFields.backedUpLocally}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </FieldRow>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t px-6 py-4 flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={enabledCount === 0 || isSubmitting}
          >
            {isSubmitting
              ? "Updating..."
              : `Update ${selectedAssetIds.length} Asset${selectedAssetIds.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Helper component for field rows
function FieldRow({
  label,
  enabled,
  onToggle,
  children,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="pt-2">
        <input
          type="checkbox"
          checked={enabled}
          onChange={onToggle}
          className="h-4 w-4 rounded border-gray-300"
        />
      </div>
      <div className="flex-1">
        <label className="text-sm font-medium block mb-1.5">{label}</label>
        {children}
      </div>
    </div>
  );
}
