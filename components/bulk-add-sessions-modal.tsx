"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InlineTypeahead } from "@/components/inline-typeahead";
import { bulkCreateSessions } from "@/lib/actions";

interface SessionRow {
  id: number;
  sessionName: string;
  sessionDate: string;
  topic: string;
  category: string;
}

interface TopicOrCategory {
  id: string;
  name: string;
}

interface BulkAddSessionsModalProps {
  eventId: string;
  eventName: string;
  defaultDate?: string;
  topics?: TopicOrCategory[];
  categories?: TopicOrCategory[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkAddSessionsModal({
  eventId,
  eventName,
  defaultDate = "",
  topics = [],
  categories = [],
  onClose,
  onSuccess,
}: BulkAddSessionsModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<SessionRow[]>(() =>
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      sessionName: "",
      sessionDate: defaultDate,
      topic: "",
      category: "",
    }))
  );

  const addMoreRows = () => {
    const newRows = Array.from({ length: 5 }, (_, i) => ({
      id: Date.now() + i,
      sessionName: "",
      sessionDate: defaultDate,
      topic: "",
      category: "",
    }));
    setRows([...rows, ...newRows]);
  };

  const updateRow = (id: number, field: keyof SessionRow, value: string) => {
    setRows(rows.map(row =>
      row.id === id ? { ...row, [field]: value } : row
    ));
  };

  const removeRow = (id: number) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id));
    }
  };

  const handleSubmit = async () => {
    setError("");

    // Filter out empty rows
    const validRows = rows.filter(row => row.sessionName.trim() !== "");

    if (validRows.length === 0) {
      setError("Please enter at least one session name");
      return;
    }

    setIsSubmitting(true);

    try {
      const sessionsData = validRows.map(row => ({
        eventId,
        sessionName: row.sessionName.trim(),
        sessionDate: row.sessionDate || null,
        topic: row.topic.trim() || null,
        category: row.category.trim() || null,
      }));

      const result = await bulkCreateSessions(sessionsData);

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Failed to create sessions");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filledRowCount = rows.filter(row => row.sessionName.trim() !== "").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Bulk Add Sessions</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Add multiple sessions to <strong>{eventName}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md">
              {error}
            </div>
          )}

          {/* Header Row */}
          <div className="grid grid-cols-[1fr_150px_140px_140px_36px] gap-2 px-1">
            <Label className="text-xs font-medium text-muted-foreground">Session Name *</Label>
            <Label className="text-xs font-medium text-muted-foreground">Date</Label>
            <Label className="text-xs font-medium text-muted-foreground">Category</Label>
            <Label className="text-xs font-medium text-muted-foreground">Topic</Label>
            <span></span>
          </div>

          {/* Data Rows */}
          <div className="space-y-1 max-h-[45vh] overflow-y-auto">
            {rows.map((row, index) => (
              <div
                key={row.id}
                className="grid grid-cols-[1fr_150px_140px_140px_36px] gap-2 items-center rounded hover:bg-muted/30"
              >
                <Input
                  placeholder={`Session ${index + 1}`}
                  value={row.sessionName}
                  onChange={(e) => updateRow(row.id, "sessionName", e.target.value)}
                  className="h-9"
                />
                <Input
                  type="date"
                  value={row.sessionDate}
                  onChange={(e) => updateRow(row.id, "sessionDate", e.target.value)}
                  className="h-9"
                />
                <InlineTypeahead
                  options={categories}
                  value={row.category}
                  onChange={(val) => updateRow(row.id, "category", val)}
                  placeholder="Category"
                />
                <InlineTypeahead
                  options={topics}
                  value={row.topic}
                  onChange={(val) => updateRow(row.id, "topic", val)}
                  placeholder="Topic"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(row.id)}
                  disabled={rows.length === 1}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                >
                  &times;
                </Button>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addMoreRows}
            className="w-full"
          >
            + Add 5 More Rows
          </Button>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {filledRowCount} session{filledRowCount !== 1 ? "s" : ""} to add
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || filledRowCount === 0}>
              {isSubmitting ? "Adding..." : `Add ${filledRowCount} Session${filledRowCount !== 1 ? "s" : ""}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Trigger button component that manages modal state
interface BulkAddSessionsButtonProps {
  eventId: string;
  eventName: string;
  defaultDate?: string;
  topics?: TopicOrCategory[];
  categories?: TopicOrCategory[];
}

export function BulkAddSessionsButton({
  eventId,
  eventName,
  defaultDate = "",
  topics = [],
  categories = [],
}: BulkAddSessionsButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setIsOpen(true)}>
        Bulk Add Sessions
      </Button>
      {isOpen && (
        <BulkAddSessionsModal
          eventId={eventId}
          eventName={eventName}
          defaultDate={defaultDate}
          topics={topics}
          categories={categories}
          onClose={() => setIsOpen(false)}
          onSuccess={() => {
            // Page will revalidate due to server action
          }}
        />
      )}
    </>
  );
}
