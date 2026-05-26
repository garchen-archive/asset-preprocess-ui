"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface Session {
  id: string;
  sessionName: string;
  eventId: string | null;
}

interface Event {
  id: string;
  eventName: string;
}

interface SessionWithHierarchy {
  session: Session;
  event: Event | null;
}

interface EventOrSessionSelectProps {
  events: Event[];
  sessions: SessionWithHierarchy[];
  defaultEventId?: string | null;
  defaultSessionId?: string | null;
}

export function EventOrSessionSelect({
  events,
  sessions,
  defaultEventId,
  defaultSessionId,
}: EventOrSessionSelectProps) {
  // Track original values to detect changes
  const originalEventId = defaultEventId || "";
  const originalSessionId = defaultSessionId || "";
  const hadOriginalAssignment = !!(originalEventId || originalSessionId);

  // Determine initial mode based on original assignment
  const initialMode = defaultSessionId ? "session" : "event";
  const [mode, setMode] = useState<"event" | "session">(initialMode);
  const [eventSearch, setEventSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>(originalEventId);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(originalSessionId);
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);

  // Track if user has made an explicit selection in the current mode
  const [hasExplicitSelection, setHasExplicitSelection] = useState(false);

  // Determine what will be submitted based on mode
  const effectiveEventId = mode === "event" ? selectedEventId : "";
  const effectiveSessionId = mode === "session" ? selectedSessionId : "";

  // Check various states
  const isUncataloged = !effectiveEventId && !effectiveSessionId;
  const willUnassign = hadOriginalAssignment && isUncataloged;
  const isChangingAssignment = (effectiveEventId !== originalEventId) || (effectiveSessionId !== originalSessionId);
  const isChangingFromEventToSession = originalEventId && !originalSessionId && mode === "session" && selectedSessionId;
  const isChangingFromSessionToEvent = originalSessionId && !originalEventId && mode === "event" && selectedEventId;

  const filteredEvents = useMemo(() => {
    if (!eventSearch) return events;
    const searchLower = eventSearch.toLowerCase();
    return events.filter((event) =>
      event.eventName.toLowerCase().includes(searchLower)
    );
  }, [events, eventSearch]);

  const filteredSessions = useMemo(() => {
    if (!sessionSearch) return sessions;
    const searchLower = sessionSearch.toLowerCase();
    return sessions.filter(
      ({ session, event }) =>
        session.sessionName.toLowerCase().includes(searchLower) ||
        event?.eventName.toLowerCase().includes(searchLower)
    );
  }, [sessions, sessionSearch]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const selectedSession = sessions.find((s) => s.session.id === selectedSessionId);
  const originalEvent = events.find((e) => e.id === originalEventId);
  const originalSession = sessions.find((s) => s.session.id === originalSessionId);

  const getSessionHierarchyLabel = (item: SessionWithHierarchy) => {
    const parts = [];
    if (item.event) parts.push(item.event.eventName);
    parts.push(item.session.sessionName);
    return parts.join(" > ");
  };

  // Handle mode change - don't auto-clear, just switch view
  const handleModeChange = (newMode: "event" | "session") => {
    setMode(newMode);
    setHasExplicitSelection(false);
  };

  // Explicit unassign action
  const handleUnassign = () => {
    setSelectedEventId("");
    setSelectedSessionId("");
    setHasExplicitSelection(true);
  };

  return (
    <div className="space-y-4">
      {/* Current Assignment Display */}
      {hadOriginalAssignment && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
          <div className="text-sm text-blue-800">
            <strong className="font-medium">Current Assignment:</strong>{" "}
            {originalSessionId && originalSession ? (
              <span>Session: {getSessionHierarchyLabel(originalSession)}</span>
            ) : originalEventId && originalEvent ? (
              <span>Event: {originalEvent.eventName}</span>
            ) : (
              <span>Unknown</span>
            )}
          </div>
        </div>
      )}

      <div>
        <Label className="text-base font-semibold">Assignment Level</Label>
        <p className="text-sm text-muted-foreground mb-3">
          Choose whether to assign this asset directly to an event or to a specific session
        </p>
        <div className="flex gap-4">
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="mode-event"
              name="assignment-mode"
              value="event"
              checked={mode === "event"}
              onChange={(e) => {
                if (e.target.checked) {
                  handleModeChange("event");
                }
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="mode-event" className="font-normal cursor-pointer">
              Event (Quick)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="radio"
              id="mode-session"
              name="assignment-mode"
              value="session"
              checked={mode === "session"}
              onChange={(e) => {
                if (e.target.checked) {
                  handleModeChange("session");
                }
              }}
              className="h-4 w-4"
            />
            <Label htmlFor="mode-session" className="font-normal cursor-pointer">
              Session (Detailed)
            </Label>
          </div>
        </div>
      </div>

      {mode === "event" ? (
        // Event Selection
        <div className="space-y-2">
          <Label htmlFor="event-select">Event</Label>
          <p className="text-xs text-muted-foreground">
            Assign asset directly to an event (can be refined to sessions later)
          </p>
          <div className="relative">
            <input
              type="text"
              id="event-select"
              placeholder="Search events..."
              value={
                isEventDropdownOpen
                  ? eventSearch
                  : selectedEvent
                  ? selectedEvent.eventName
                  : ""
              }
              onChange={(e) => {
                setEventSearch(e.target.value);
                setIsEventDropdownOpen(true);
              }}
              onFocus={() => setIsEventDropdownOpen(true)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />

            {/* Hidden inputs for form submission - only submit based on current mode */}
            <input type="hidden" name="eventId" value={effectiveEventId} />
            <input type="hidden" name="eventSessionId" value={effectiveSessionId} />

            {/* Dropdown */}
            {isEventDropdownOpen && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                {filteredEvents.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No events found
                  </div>
                ) : (
                  filteredEvents.map((event) => (
                    <div
                      key={event.id}
                      className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm ${
                        selectedEventId === event.id ? "bg-accent" : ""
                      }`}
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setSelectedSessionId(""); // Clear session when selecting event
                        setEventSearch("");
                        setIsEventDropdownOpen(false);
                        setHasExplicitSelection(true);
                      }}
                    >
                      <div className="font-medium">{event.eventName}</div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Backdrop to close dropdown */}
          {isEventDropdownOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsEventDropdownOpen(false)}
            />
          )}
        </div>
      ) : (
        // Session Selection
        <div className="space-y-2">
          <Label htmlFor="session-select">Session</Label>
          <p className="text-xs text-muted-foreground">
            Assign asset to a specific session within an event
          </p>
          <div className="relative">
            <input
              type="text"
              id="session-select"
              placeholder="Search by event or session..."
              value={
                isSessionDropdownOpen
                  ? sessionSearch
                  : selectedSession
                  ? getSessionHierarchyLabel(selectedSession)
                  : ""
              }
              onChange={(e) => {
                setSessionSearch(e.target.value);
                setIsSessionDropdownOpen(true);
              }}
              onFocus={() => setIsSessionDropdownOpen(true)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />

            {/* Hidden inputs for form submission - only submit based on current mode */}
            <input type="hidden" name="eventId" value={effectiveEventId} />
            <input type="hidden" name="eventSessionId" value={effectiveSessionId} />

            {/* Dropdown */}
            {isSessionDropdownOpen && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                {filteredSessions.length === 0 ? (
                  <div className="px-2 py-1.5 text-sm text-muted-foreground">
                    No sessions found
                  </div>
                ) : (
                  filteredSessions.map((item) => (
                    <div
                      key={item.session.id}
                      className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm ${
                        selectedSessionId === item.session.id ? "bg-accent" : ""
                      }`}
                      onClick={() => {
                        setSelectedSessionId(item.session.id);
                        setSelectedEventId(""); // Clear event when selecting session
                        setSessionSearch("");
                        setIsSessionDropdownOpen(false);
                        setHasExplicitSelection(true);
                      }}
                    >
                      <div className="font-medium">{item.session.sessionName}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.event && <span>{item.event.eventName}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Backdrop to close dropdown */}
          {isSessionDropdownOpen && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsSessionDropdownOpen(false)}
            />
          )}
        </div>
      )}

      {/* Explicit Unassign Button */}
      {hadOriginalAssignment && !isUncataloged && (
        <div className="pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleUnassign}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            Unassign from {originalSessionId ? "Session" : "Event"}
          </Button>
        </div>
      )}

      {/* Warning when assignment will change */}
      {isChangingAssignment && !willUnassign && (effectiveEventId || effectiveSessionId) && (
        <div className="rounded-md bg-blue-50 border border-blue-200 p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-blue-800">
              <strong className="font-medium">Assignment will change:</strong>{" "}
              {isChangingFromEventToSession && selectedSession ? (
                <span>Event → Session: {getSessionHierarchyLabel(selectedSession)}</span>
              ) : isChangingFromSessionToEvent && selectedEvent ? (
                <span>Session → Event: {selectedEvent.eventName}</span>
              ) : effectiveSessionId && selectedSession ? (
                <span>New session: {getSessionHierarchyLabel(selectedSession)}</span>
              ) : effectiveEventId && selectedEvent ? (
                <span>New event: {selectedEvent.eventName}</span>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Warning when asset will be unassigned */}
      {willUnassign && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-red-800">
              <strong className="font-medium">Warning:</strong> This asset will be unassigned and become uncataloged.
              {mode === "event" && !selectedEventId && (
                <span> Please select an event or click "Unassign" explicitly.</span>
              )}
              {mode === "session" && !selectedSessionId && (
                <span> Please select a session or click "Unassign" explicitly.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Warning when asset is uncataloged (no original assignment) */}
      {isUncataloged && !hadOriginalAssignment && (
        <div className="rounded-md bg-yellow-50 border border-yellow-200 p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
            <div className="text-sm text-yellow-800">
              <strong className="font-medium">Uncataloged Asset:</strong> This asset is not assigned to any event or session. Please assign it to continue cataloging.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
