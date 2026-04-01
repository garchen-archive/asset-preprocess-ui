"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FilterMultiSelect } from "@/components/filter-multi-select";
import { CollapsibleFilterSection } from "@/components/collapsible-filter-section";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface AssetFiltersProps {
  search: string;
  selectedStatuses: string[];
  selectedPublicationStatuses: string[];
  typeFilter: string;
  sourceFilter: string;
  isMediaFileFilter: string;
  safeToDeleteFilter: string;
  excludeFilter: string;
  selectedFormats: string[];
  availableFormats: string[];
  hasOralTranslationFilter: string;
  selectedInterpreterLangs: string[];
  availableLanguages: string[];
  selectedTranscriptLangs: string[];
  hasTimestampedTranscriptFilter: string;
  transcriptsAvailableFilter: string;
  needsDetailedReviewFilter: string;
  hasTranscriptRecordFilter: string;
  dateSearchFilter: string;
  dateFromFilter: string;
  dateToFilter: string;
}

const PROCESSING_STATUS_OPTIONS = [
  { value: "raw", label: "Raw" },
  { value: "queued", label: "Queued" },
  { value: "ingesting", label: "Ingesting" },
  { value: "transcoded", label: "Transcoded" },
  { value: "transcribing", label: "Transcribing" },
  { value: "transcribed", label: "Transcribed" },
  { value: "failed", label: "Failed" },
];

const PUBLICATION_STATUS_OPTIONS = [
  { value: "draft", label: "Draft" },
  { value: "in_review", label: "In Review" },
  { value: "approved", label: "Approved" },
  { value: "published", label: "Published" },
  { value: "needs_work", label: "Needs Work" },
  { value: "archived", label: "Archived" },
];

const TRANSCRIPT_LANGUAGE_OPTIONS = [
  { value: "EN", label: "English" },
  { value: "ZH", label: "Chinese" },
  { value: "Tibetan", label: "Tibetan" },
  { value: "German", label: "German" },
  { value: "Vietnamese", label: "Vietnamese" },
  { value: "French", label: "French" },
  { value: "Spanish", label: "Spanish" },
  { value: "Portuguese", label: "Portuguese" },
  { value: "Other", label: "Other" },
];

export function AssetFilters({
  search,
  selectedStatuses,
  selectedPublicationStatuses,
  typeFilter,
  sourceFilter,
  isMediaFileFilter,
  safeToDeleteFilter,
  excludeFilter,
  selectedFormats,
  availableFormats,
  hasOralTranslationFilter,
  selectedInterpreterLangs,
  availableLanguages,
  selectedTranscriptLangs,
  hasTimestampedTranscriptFilter,
  transcriptsAvailableFilter,
  needsDetailedReviewFilter,
  hasTranscriptRecordFilter,
  dateSearchFilter,
  dateFromFilter,
  dateToFilter,
}: AssetFiltersProps) {
  // Count active filters for badges
  const dateFilterCount = (dateSearchFilter ? 1 : 0) + (dateFromFilter ? 1 : 0) + (dateToFilter ? 1 : 0);
  const processingFilterCount = selectedStatuses.length + selectedPublicationStatuses.length + (needsDetailedReviewFilter ? 1 : 0);
  const transcriptFilterCount =
    selectedTranscriptLangs.length +
    (hasTimestampedTranscriptFilter ? 1 : 0) +
    (transcriptsAvailableFilter ? 1 : 0) +
    (hasTranscriptRecordFilter ? 1 : 0);
  // excludeFilter defaults to "false" (Included), so only count as active filter if explicitly set to something else
  const fileFilterCount =
    selectedFormats.length +
    (isMediaFileFilter ? 1 : 0) +
    (safeToDeleteFilter ? 1 : 0) +
    (excludeFilter && excludeFilter !== "false" ? 1 : 0);
  const interpreterFilterCount = selectedInterpreterLangs.length + (hasOralTranslationFilter ? 1 : 0);

  // Check if any filters are active (excludeFilter defaults to "false", so only count as active if different)
  const hasActiveFilters =
    search ||
    selectedStatuses.length > 0 ||
    selectedPublicationStatuses.length > 0 ||
    typeFilter ||
    sourceFilter ||
    isMediaFileFilter ||
    safeToDeleteFilter ||
    (excludeFilter && excludeFilter !== "false") ||
    selectedFormats.length > 0 ||
    hasOralTranslationFilter ||
    selectedInterpreterLangs.length > 0 ||
    selectedTranscriptLangs.length > 0 ||
    hasTimestampedTranscriptFilter ||
    transcriptsAvailableFilter ||
    needsDetailedReviewFilter ||
    hasTranscriptRecordFilter ||
    dateSearchFilter ||
    dateFromFilter ||
    dateToFilter;

  return (
    <form className="rounded-lg border p-4" method="GET">
      {/* Primary filters - always visible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-2">
          <label className="text-sm font-medium mb-1.5 block">Search</label>
          <Input
            name="search"
            placeholder="Search by name, title, filepath or description..."
            defaultValue={search}
          />
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Type</label>
          <select
            name="type"
            defaultValue={typeFilter}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Types</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
            <option value="image">Image</option>
            <option value="document">Document</option>
            <option value="subtitle">Subtitle</option>
          </select>
        </div>

        <div>
          <label className="text-sm font-medium mb-1.5 block">Source</label>
          <select
            name="source"
            defaultValue={sourceFilter}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="">All Sources</option>
            <option value="gdrive">Google Drive</option>
            <option value="youtube">YouTube</option>
            <option value="backblaze">Backblaze</option>
          </select>
        </div>
      </div>

      {/* Date Filters */}
      <CollapsibleFilterSection
        title="Date"
        badge={dateFilterCount}
        defaultOpen={dateFilterCount > 0}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="text-xs font-medium mb-1 block">Date Search</label>
            <Input
              type="text"
              name="dateSearch"
              placeholder="2019, 2019-07, or 2019-07-13"
              defaultValue={dateSearchFilter}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Searches file creation date and original content/recording date
            </p>
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">From</label>
            <Input
              type="date"
              name="dateFrom"
              defaultValue={dateFromFilter}
            />
          </div>
          <div>
            <label className="text-xs font-medium mb-1 block">To</label>
            <Input
              type="date"
              name="dateTo"
              defaultValue={dateToFilter}
            />
          </div>
        </div>
      </CollapsibleFilterSection>

      {/* Processing & Publication Filters */}
      <CollapsibleFilterSection
        title="Processing & Publication"
        badge={processingFilterCount}
        defaultOpen={processingFilterCount > 0}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FilterMultiSelect
            name="status"
            label="Processing Status"
            options={PROCESSING_STATUS_OPTIONS}
            selectedValues={selectedStatuses}
            placeholder="Select statuses..."
          />
          <FilterMultiSelect
            name="publicationStatus"
            label="Publication Status"
            options={PUBLICATION_STATUS_OPTIONS}
            selectedValues={selectedPublicationStatuses}
            placeholder="Select statuses..."
          />
          <div>
            <label className="text-sm font-medium mb-1.5 block">Needs Detailed Review</label>
            <select
              name="needsDetailedReview"
              defaultValue={needsDetailedReviewFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </CollapsibleFilterSection>

      {/* Transcript Filters */}
      <CollapsibleFilterSection
        title="Transcripts"
        badge={transcriptFilterCount}
        defaultOpen={transcriptFilterCount > 0}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Has Transcript Record</label>
            <select
              name="hasTranscriptRecord"
              defaultValue={hasTranscriptRecordFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Available (Legacy)</label>
            <select
              name="transcriptsAvailable"
              defaultValue={transcriptsAvailableFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Timestamped (Legacy)</label>
            <select
              name="hasTimestampedTranscript"
              defaultValue={hasTimestampedTranscriptFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="Yes">Yes</option>
              <option value="Partial">Partial</option>
              <option value="No">No</option>
            </select>
          </div>
          <FilterMultiSelect
            name="transcriptLangs"
            label="Languages (Legacy)"
            options={TRANSCRIPT_LANGUAGE_OPTIONS}
            selectedValues={selectedTranscriptLangs}
            placeholder="Select languages..."
          />
        </div>
      </CollapsibleFilterSection>

      {/* Interpreter Filters */}
      <CollapsibleFilterSection
        title="Interpreter"
        badge={interpreterFilterCount}
        defaultOpen={interpreterFilterCount > 0}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Has Oral Translation</label>
            <select
              name="hasOralTranslation"
              defaultValue={hasOralTranslationFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          {availableLanguages.length > 0 && (
            <FilterMultiSelect
              name="interpreterLangs"
              label="Interpreter Languages"
              options={availableLanguages.map(lang => ({ value: lang, label: lang }))}
              selectedValues={selectedInterpreterLangs}
              placeholder="Select languages..."
            />
          )}
        </div>
      </CollapsibleFilterSection>

      {/* File Details Filters */}
      <CollapsibleFilterSection
        title="File Details"
        badge={fileFilterCount}
        defaultOpen={fileFilterCount > 0}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Media File</label>
            <select
              name="isMediaFile"
              defaultValue={isMediaFileFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Files</option>
              <option value="true">Media Files</option>
              <option value="false">Non-Media Files</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Safe to Delete</label>
            <select
              name="safeToDelete"
              defaultValue={safeToDeleteFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Safe to Delete</option>
              <option value="false">Keep</option>
            </select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Archive Status</label>
            <select
              name="exclude"
              defaultValue={excludeFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All</option>
              <option value="true">Excluded</option>
              <option value="false">Included</option>
            </select>
          </div>
        </div>
        {availableFormats.length > 0 && (
          <FilterMultiSelect
            name="formats"
            label="File Formats"
            options={availableFormats.map(format => ({ value: format, label: format.toUpperCase() }))}
            selectedValues={selectedFormats}
            placeholder="Select formats..."
          />
        )}
      </CollapsibleFilterSection>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4 pt-4 border-t">
        <Button type="submit">Apply Filters</Button>
        {hasActiveFilters && (
          <Button type="button" variant="outline" asChild>
            <Link href="/assets">Clear All</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
