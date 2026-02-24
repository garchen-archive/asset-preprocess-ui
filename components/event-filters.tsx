"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CollapsibleFilterSection } from "@/components/collapsible-filter-section";
import { SearchableSelect } from "@/components/searchable-select";
import { OrgSelect } from "@/components/org-select";

interface EventFiltersProps {
  search: string;
  viewFilter: string;
  statusFilter: string;
  typeFilter: string;
  formatFilter: string;
  sourceFilter: string;
  organizerFilter: string;
  hostingCenterFilter: string;
  countryFilter: string;
  locationRawFilter: string;
  metadataSearch: string;
  dateFromFilter: string;
  dateToFilter: string;
  dateExactFilter: string;
  topicFilter: string;
  categoryFilter: string;
  availableTypes: { type: string | null }[];
  availableOrganizers: { id: string; code: string; name: string }[];
  availableHostingCenters: string[];
  availableCountries: string[];
  availableLocationTexts: string[];
  availableTopics: string[];
  availableCategories: string[];
}

export function EventFilters({
  search,
  viewFilter,
  statusFilter,
  typeFilter,
  formatFilter,
  sourceFilter,
  organizerFilter,
  hostingCenterFilter,
  countryFilter,
  locationRawFilter,
  metadataSearch,
  dateFromFilter,
  dateToFilter,
  dateExactFilter,
  topicFilter,
  categoryFilter,
  availableTypes,
  availableOrganizers,
  availableHostingCenters,
  availableCountries,
  availableLocationTexts,
  availableTopics,
  availableCategories,
}: EventFiltersProps) {
  const advancedFilterCount =
    (dateFromFilter ? 1 : 0) +
    (dateToFilter ? 1 : 0) +
    (dateExactFilter ? 1 : 0) +
    (topicFilter ? 1 : 0) +
    (categoryFilter ? 1 : 0);

  const metadataFilterCount =
    (hostingCenterFilter ? 1 : 0) +
    (countryFilter ? 1 : 0) +
    (locationRawFilter ? 1 : 0) +
    (metadataSearch ? 1 : 0);

  const hasActiveFilters =
    search ||
    viewFilter !== "all" ||
    statusFilter ||
    typeFilter ||
    formatFilter ||
    sourceFilter ||
    organizerFilter ||
    hostingCenterFilter ||
    countryFilter ||
    locationRawFilter ||
    metadataSearch ||
    dateFromFilter ||
    dateToFilter ||
    dateExactFilter ||
    topicFilter ||
    categoryFilter;

  return (
    <form className="rounded-lg border p-3" method="GET">
      {/* Primary filters - always visible */}
      <div className="grid grid-cols-2 md:grid-cols-8 gap-3">
        <div className="col-span-2">
          <label className="text-xs font-medium mb-1 block">Search</label>
          <Input
            name="search"
            placeholder="Search by name or date..."
            defaultValue={search}
          />
        </div>

        <div>
          <OrgSelect
            organizations={availableOrganizers}
            defaultValue={organizerFilter}
            name="organizer"
            label="Host Org"
            placeholder="Select org..."
            compact
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">View</label>
          <select
            name="view"
            defaultValue={viewFilter}
            className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="top-level">Top-Level</option>
            <option value="all">All</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Status</label>
          <select
            name="status"
            defaultValue={statusFilter}
            className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="null">Not Started</option>
            <option value="In Progress">In Progress</option>
            <option value="Ready">Ready</option>
            <option value="Needs Review">Needs Review</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Type</label>
          <select
            name="type"
            defaultValue={typeFilter}
            className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="">All</option>
            {availableTypes.map((t) => (
              <option key={t.type} value={t.type!}>
                {t.type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Format</label>
          <select
            name="format"
            defaultValue={formatFilter}
            className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="single_recording">Single Recording</option>
            <option value="series">Series</option>
            <option value="retreat">Retreat</option>
            <option value="collection">Collection</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium mb-1 block">Source</label>
          <select
            name="source"
            defaultValue={sourceFilter}
            className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="admin_tool">Admin Tool</option>
            <option value="google_sheet">Google Sheet</option>
            <option value="migration">Migration</option>
            <option value="null">No Source</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters - Date, Topic, Category */}
      <CollapsibleFilterSection
        title="Advanced Filters"
        badge={advancedFilterCount}
        defaultOpen={advancedFilterCount > 0}
      >
        <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
          {/* Date Search */}
          <div className="md:col-span-2">
            <label className="text-xs font-medium mb-1 block">Date Search</label>
            <Input
              type="text"
              name="dateExact"
              placeholder="2019, 2019-07, 2019-07-13"
              defaultValue={dateExactFilter}
            />
          </div>

          {/* Date Range */}
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

          {/* Topic */}
          {availableTopics.length > 0 && (
            <div>
              <label className="text-xs font-medium mb-1 block">Topic</label>
              <SearchableSelect
                options={availableTopics}
                value={topicFilter}
                name="topic"
                placeholder="Search topics..."
              />
            </div>
          )}

          {/* Category */}
          {availableCategories.length > 0 && (
            <div>
              <label className="text-xs font-medium mb-1 block">Category</label>
              <SearchableSelect
                options={availableCategories}
                value={categoryFilter}
                name="category"
                placeholder="Search categories..."
              />
            </div>
          )}

        </div>
      </CollapsibleFilterSection>

      {/* Sheet Metadata Filters */}
      <CollapsibleFilterSection
        title="Additional Metadata"
        badge={metadataFilterCount}
        defaultOpen={metadataFilterCount > 0}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Search Metadata</label>
            <Input
              name="metadataSearch"
              placeholder="Search all..."
              defaultValue={metadataSearch}
            />
          </div>
          {availableHostingCenters.length > 0 && (
            <div>
              <label className="text-xs font-medium mb-1 block">Hosting Center</label>
              <select
                name="hostingCenter"
                defaultValue={hostingCenterFilter}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">All</option>
                {availableHostingCenters.map((hc) => (
                  <option key={hc} value={hc}>
                    {hc}
                  </option>
                ))}
              </select>
            </div>
          )}
          {availableCountries.length > 0 && (
            <div>
              <label className="text-xs font-medium mb-1 block">Country</label>
              <select
                name="country"
                defaultValue={countryFilter}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">All</option>
                {availableCountries.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          )}
          {availableLocationTexts.length > 0 && (
            <div>
              <label className="text-xs font-medium mb-1 block">Location</label>
              <select
                name="locationRaw"
                defaultValue={locationRawFilter}
                className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm"
              >
                <option value="">All</option>
                {availableLocationTexts.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </CollapsibleFilterSection>

      {/* Action buttons */}
      <div className="flex gap-2 mt-3 pt-3 border-t">
        <Button type="submit" size="sm">Apply</Button>
        {hasActiveFilters && (
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/events">Clear</Link>
          </Button>
        )}
      </div>
    </form>
  );
}
