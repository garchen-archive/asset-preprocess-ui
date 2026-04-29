"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";

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
  // Determine initial mode: 'event' or 'session' based on which has a value
  const initialMode = defaultSessionId ? "session" : "event";
  const [mode, setMode] = useState<"event" | "session">(initialMode);
  const [eventSearch, setEventSearch] = useState("");
  const [sessionSearch, setSessionSearch] = useState("");
  const [selectedEventId, setSelectedEventId] = useState<string>(
    defaultEventId || ""
  );
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    defaultSessionId || ""
  );
  const [isEventDropdownOpen, setIsEventDropdownOpen] = useState(false);
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false);

  // Check if asset is uncataloged (neither event nor session selected)
  const isUncataloged = !selectedEventId && !selectedSessionId;

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

  const getSessionHierarchyLabel = (item: SessionWithHierarchy) => {
    const parts = [];
    if (item.event) parts.push(item.event.eventName);
    parts.push(item.session.sessionName);
    return parts.join(" > ");
  };

  return (
    <div className="space-y-4">
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
                  setMode("event");
                  setSelectedSessionId("");
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
                  setMode("session");
                  setSelectedEventId("");
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

            {/* Hidden input for form submission */}
            <input type="hidden" name="eventId" value={selectedEventId} />
            <input type="hidden" name="eventSessionId" value="" />

            {/* Dropdown */}
            {isEventDropdownOpen && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                <div
                  className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                  onClick={() => {
                    setSelectedEventId("");
                    setEventSearch("");
                    setIsEventDropdownOpen(false);
                  }}
                >
                  <span className="text-muted-foreground">None</span>
                </div>
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
                        setEventSearch("");
                        setIsEventDropdownOpen(false);
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

            {/* Hidden inputs for form submission */}
            <input type="hidden" name="eventId" value="" />
            <input type="hidden" name="eventSessionId" value={selectedSessionId} />

            {/* Dropdown */}
            {isSessionDropdownOpen && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
                <div
                  className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
                  onClick={() => {
                    setSelectedSessionId("");
                    setSessionSearch("");
                    setIsSessionDropdownOpen(false);
                  }}
                >
                  <span className="text-muted-foreground">None</span>
                </div>
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
                        setSessionSearch("");
                        setIsSessionDropdownOpen(false);
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

      {/* Warning when asset is uncataloged */}
      {isUncataloged && (
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
