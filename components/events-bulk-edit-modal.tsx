"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { OrgSelect } from "@/components/org-select";
import { bulkUpdateEvents } from "@/lib/actions";

interface EventsBulkEditModalProps {
  selectedEventIds: string[];
  organizations: { id: string; code: string; name: string }[];
  availableTypes: string[];
  onClose: () => void;
  onSuccess: () => void;
}

const CATALOGING_STATUS_OPTIONS = [
  { value: "Not Started", label: "Not Started" },
  { value: "In Progress", label: "In Progress" },
  { value: "Ready", label: "Ready" },
  { value: "Needs Review", label: "Needs Review" },
];

const EVENT_FORMAT_OPTIONS = [
  { value: "", label: "— None —" },
  { value: "single_recording", label: "Single Recording" },
  { value: "series", label: "Series" },
  { value: "retreat", label: "Retreat" },
  { value: "collection", label: "Collection" },
];

export function EventsBulkEditModal({
  selectedEventIds,
  organizations,
  availableTypes,
  onClose,
  onSuccess,
}: EventsBulkEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Track which fields are enabled for update
  const [enabledFields, setEnabledFields] = useState<Record<string, boolean>>({});

  // Field values
  const [hostOrganizationId, setHostOrganizationId] = useState("");
  const [organizerOrganizationId, setOrganizerOrganizationId] = useState("");
  const [eventType, setEventType] = useState("");
  const [eventFormat, setEventFormat] = useState("");
  const [catalogingStatus, setCatalogingStatus] = useState("Not Started");

  const toggleField = (field: string) => {
    setEnabledFields((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const updates: Record<string, unknown> = {};

      if (enabledFields.hostOrganizationId) updates.hostOrganizationId = hostOrganizationId || null;
      if (enabledFields.organizerOrganizationId) updates.organizerOrganizationId = organizerOrganizationId || null;
      if (enabledFields.eventType) updates.eventType = eventType || null;
      if (enabledFields.eventFormat) updates.eventFormat = eventFormat || null;
      if (enabledFields.catalogingStatus) updates.catalogingStatus = catalogingStatus || null;

      if (Object.keys(updates).length === 0) {
        setError("Please select at least one field to update");
        setIsSubmitting(false);
        return;
      }

      const result = await bulkUpdateEvents({
        eventIds: selectedEventIds,
        updates,
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Failed to update events");
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
            <h2 className="text-xl font-semibold">Bulk Edit Events</h2>
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
            Editing {selectedEventIds.length} event{selectedEventIds.length !== 1 ? "s" : ""}
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

          {/* Orgs Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Orgs</h3>

            <FieldRow
              label="Host Org"
              enabled={enabledFields.hostOrganizationId}
              onToggle={() => toggleField("hostOrganizationId")}
            >
              <OrgSelect
                organizations={organizations}
                value={hostOrganizationId}
                onChange={setHostOrganizationId}
                name=""
                placeholder="Search host org..."
                disabled={!enabledFields.hostOrganizationId}
              />
            </FieldRow>

            <FieldRow
              label="Organizer Org"
              enabled={enabledFields.organizerOrganizationId}
              onToggle={() => toggleField("organizerOrganizationId")}
            >
              <OrgSelect
                organizations={organizations}
                value={organizerOrganizationId}
                onChange={setOrganizerOrganizationId}
                name=""
                placeholder="Search organizer org..."
                disabled={!enabledFields.organizerOrganizationId}
              />
            </FieldRow>
          </div>

          {/* Details Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 border-b pb-1">Details</h3>

            <FieldRow
              label="Event Type"
              enabled={enabledFields.eventType}
              onToggle={() => toggleField("eventType")}
            >
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value)}
                disabled={!enabledFields.eventType}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                <option value="">— None —</option>
                {availableTypes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </FieldRow>

            <FieldRow
              label="Event Format"
              enabled={enabledFields.eventFormat}
              onToggle={() => toggleField("eventFormat")}
            >
              <select
                value={eventFormat}
                onChange={(e) => setEventFormat(e.target.value)}
                disabled={!enabledFields.eventFormat}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {EVENT_FORMAT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </FieldRow>

            <FieldRow
              label="Cataloging Status"
              enabled={enabledFields.catalogingStatus}
              onToggle={() => toggleField("catalogingStatus")}
            >
              <select
                value={catalogingStatus}
                onChange={(e) => setCatalogingStatus(e.target.value)}
                disabled={!enabledFields.catalogingStatus}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm disabled:opacity-50"
              >
                {CATALOGING_STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
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
              : `Update ${selectedEventIds.length} Event${selectedEventIds.length !== 1 ? "s" : ""}`}
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
