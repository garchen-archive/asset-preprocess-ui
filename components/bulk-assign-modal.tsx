"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EventSelect } from "@/components/event-select";
import { SessionSelect } from "@/components/session-select";
import { bulkAssignAssets } from "@/lib/actions";

interface Event {
  id: string;
  eventName: string;
  eventDateStart: string | null;
  eventDateEnd: string | null;
  eventType: string | null;
}

interface Session {
  id: string;
  sessionName: string;
  sessionDate: string | null;
  eventId: string | null;
}

interface SessionWithHierarchy {
  session: Session;
  event: Event | null;
}

interface BulkAssignModalProps {
  selectedAssetIds: string[];
  events: Event[];
  sessions: SessionWithHierarchy[];
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkAssignModal({
  selectedAssetIds,
  events,
  sessions,
  onClose,
  onSuccess,
}: BulkAssignModalProps) {
  const [mode, setMode] = useState<"event" | "session">("event");
  const [selectedEventId, setSelectedEventId] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      const result = await bulkAssignAssets({
        assetIds: selectedAssetIds,
        eventId: mode === "event" ? selectedEventId : null,
        eventSessionId: mode === "session" ? selectedSessionId : null,
      });

      if (result.success) {
        onSuccess();
        onClose();
      } else {
        setError(result.error || "Failed to assign assets");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const selectedSession = sessions.find((s) => s.session.id === selectedSessionId);

  const canSubmit =
    (mode === "event" && selectedEventId) ||
    (mode === "session" && selectedSessionId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="px-6 pt-5 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">Assign Assets</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                {selectedAssetIds.length} asset{selectedAssetIds.length !== 1 ? "s" : ""} selected
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
        <div className="px-6 pb-6 space-y-5 min-h-[350px]">
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {/* Assignment Mode Toggle */}
          <div className="flex rounded-md border overflow-hidden">
            <button
              type="button"
              onClick={() => { setMode("event"); setSelectedSessionId(""); }}
              className={`flex-1 px-4 py-2 text-sm font-medium transition-colors ${
                mode === "event"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Assign to Event
            </button>
            <button
              type="button"
              onClick={() => { setMode("session"); setSelectedEventId(""); }}
              className={`flex-1 px-4 py-2 text-sm font-medium border-l transition-colors ${
                mode === "session"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              Assign to Session
            </button>
          </div>

          {/* Selection */}
          {mode === "event" ? (
            <EventSelect
              events={events}
              value={selectedEventId}
              onChange={setSelectedEventId}
              placeholder="Search events..."
            />
          ) : (
            <SessionSelect
              sessions={sessions}
              value={selectedSessionId}
              onChange={setSelectedSessionId}
              label=""
              name=""
            />
          )}

          {/* Warning */}
          <p className="text-xs text-muted-foreground">
            This will overwrite any existing assignments for the selected assets.
          </p>
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
            disabled={!canSubmit || isSubmitting}
          >
            {isSubmitting ? "Assigning..." : `Assign ${selectedAssetIds.length} Asset${selectedAssetIds.length !== 1 ? "s" : ""}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
