"use client";

import { useState } from "react";
import Link from "next/link";
import { ExpandableEventRow } from "./expandable-event-row";
import { EventsBulkEditModal } from "./events-bulk-edit-modal";
import { Button } from "./ui/button";
import { ColumnVisibilityToggle, type ColumnConfig } from "./column-visibility-toggle";
import type { Event } from "@/lib/db/schema";

type EventRow = {
  event: Event;
  parentEventName: string | null;
  organizerName: string | null;
  hostOrgName: string | null;
  sessionCount: number;
  assetCount: number;
  childEventCount: number;
  topicNames: string | null;
  categoryNames: string | null;
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { key: "eventName", label: "Event Name", visible: true },
  { key: "type", label: "Type", visible: true },
  { key: "format", label: "Format", visible: false },
  { key: "dateRange", label: "Date Range", visible: true },
  { key: "childEvents", label: "Child Events", visible: true },
  { key: "sessions", label: "Sessions", visible: true },
  { key: "assets", label: "Assets", visible: true },
  { key: "status", label: "Status", visible: true },
  { key: "topic", label: "Topic", visible: false },
  { key: "category", label: "Category", visible: false },
  { key: "hostOrg", label: "Host Org", visible: false },
];

type EventsPageClientProps = {
  eventsList: EventRow[];
  organizations: { id: string; code: string; name: string }[];
  availableTypes: string[];
  offset: number;
  sortBy: string;
  sortOrder: string;
  searchParams: Record<string, string | string[] | undefined>;
};

export function EventsPageClient({
  eventsList,
  organizations,
  availableTypes,
  offset,
  sortBy,
  sortOrder,
  searchParams,
}: EventsPageClientProps) {
  const [selectedEventIds, setSelectedEventIds] = useState<string[]>([]);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS);

  const isColumnVisible = (key: string) => {
    const column = columns.find((col) => col.key === key);
    return column?.visible ?? false;
  };

  const getSortUrl = (column: string) => {
    const newSortOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    Object.entries(searchParams).forEach(([key, value]) => {
      if (value == null || value === "") return;
      if (Array.isArray(value)) {
        value.forEach(v => params.append(key, v));
      } else {
        params.set(key, value);
      }
    });
    params.set("sortBy", column);
    params.set("sortOrder", newSortOrder);
    params.delete("page");
    return `/events?${params}`;
  };

  const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => {
    const isActive = sortBy === column;
    return (
      <th className="px-4 py-3 text-left text-sm font-medium">
        <Link
          href={getSortUrl(column)}
          className="flex items-center gap-1 hover:underline group cursor-pointer"
        >
          {children}
          {isActive ? (
            <span className="text-xs font-bold">
              {sortOrder === "asc" ? "\u2191" : "\u2193"}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
              {"\u2195"}
            </span>
          )}
        </Link>
      </th>
    );
  };

  const allEventIds = eventsList.map((e) => e.event.id);
  const allSelected = allEventIds.length > 0 && allEventIds.every((id) => selectedEventIds.includes(id));
  const someSelected = selectedEventIds.length > 0 && !allSelected;

  const handleToggleEvent = (eventId: string) => {
    setSelectedEventIds((prev) =>
      prev.includes(eventId) ? prev.filter((id) => id !== eventId) : [...prev, eventId]
    );
  };

  const handleToggleAll = () => {
    if (allSelected) {
      setSelectedEventIds([]);
    } else {
      setSelectedEventIds(allEventIds);
    }
  };

  const handleBulkEditSuccess = () => {
    setSelectedEventIds([]);
    window.location.reload();
  };

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedEventIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-blue-900">
                {selectedEventIds.length} event{selectedEventIds.length !== 1 ? "s" : ""} selected
              </div>
              <button
                onClick={() => setSelectedEventIds([])}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBulkEditModal(true)}
                size="sm"
                variant="outline"
              >
                Edit Fields
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Column Visibility Toggle */}
      <div className="flex justify-end mb-4">
        <ColumnVisibilityToggle
          columns={columns}
          onChange={setColumns}
          storageKey="events-table-columns"
        />
      </div>

      {/* Events Table */}
      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => {
                    if (el) el.indeterminate = someSelected;
                  }}
                  onChange={handleToggleAll}
                  className="h-4 w-4 rounded border-gray-300"
                />
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium w-16">#</th>
              {isColumnVisible("eventName") && (
                <SortableHeader column="eventName">Event Name</SortableHeader>
              )}
              {isColumnVisible("type") && (
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
              )}
              {isColumnVisible("format") && (
                <th className="px-4 py-3 text-left text-sm font-medium">Format</th>
              )}
              {isColumnVisible("dateRange") && (
                <SortableHeader column="eventDateStart">Date Range</SortableHeader>
              )}
              {isColumnVisible("topic") && (
                <SortableHeader column="topic">Topic</SortableHeader>
              )}
              {isColumnVisible("category") && (
                <SortableHeader column="category">Category</SortableHeader>
              )}
              {isColumnVisible("hostOrg") && (
                <SortableHeader column="hostOrg">Host Org</SortableHeader>
              )}
              {isColumnVisible("childEvents") && (
                <th className="px-4 py-3 text-left text-sm font-medium">Child Events</th>
              )}
              {isColumnVisible("sessions") && (
                <th className="px-4 py-3 text-left text-sm font-medium">Sessions</th>
              )}
              {isColumnVisible("assets") && (
                <th className="px-4 py-3 text-left text-sm font-medium">Assets</th>
              )}
              {isColumnVisible("status") && (
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              )}
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {eventsList.map(({ event, parentEventName, organizerName, hostOrgName, sessionCount, assetCount, childEventCount, topicNames, categoryNames }, index) => (
              <ExpandableEventRow
                key={event.id}
                event={event}
                parentEventName={parentEventName}
                organizerName={organizerName}
                hostOrgName={hostOrgName}
                childEventCount={childEventCount}
                sessionCount={sessionCount}
                assetCount={assetCount}
                topicNames={topicNames}
                categoryNames={categoryNames}
                index={index + offset}
                isSelected={selectedEventIds.includes(event.id)}
                onToggleSelect={() => handleToggleEvent(event.id)}
                visibleColumns={{
                  eventName: isColumnVisible("eventName"),
                  type: isColumnVisible("type"),
                  format: isColumnVisible("format"),
                  dateRange: isColumnVisible("dateRange"),
                  topic: isColumnVisible("topic"),
                  category: isColumnVisible("category"),
                  hostOrg: isColumnVisible("hostOrg"),
                  childEvents: isColumnVisible("childEvents"),
                  sessions: isColumnVisible("sessions"),
                  assets: isColumnVisible("assets"),
                  status: isColumnVisible("status"),
                }}
              />
            ))}
          </tbody>
        </table>
      </div>

      {eventsList.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No events found. Create your first event to get started.
        </div>
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <EventsBulkEditModal
          selectedEventIds={selectedEventIds}
          organizations={organizations}
          availableTypes={availableTypes}
          onClose={() => setShowBulkEditModal(false)}
          onSuccess={handleBulkEditSuccess}
        />
      )}
    </>
  );
}
