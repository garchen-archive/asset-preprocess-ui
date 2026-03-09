"use client";

import { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { formatDate } from "@/lib/utils";

interface Session {
  id: string;
  sessionName: string;
  sessionDate: string | null;
  eventId: string | null;
}

interface Event {
  id: string;
  eventName: string;
  eventDateStart: string | null;
  eventDateEnd: string | null;
  eventType: string | null;
}

interface SessionWithHierarchy {
  session: Session;
  event: Event | null;
}

interface SessionSelectProps {
  sessions: SessionWithHierarchy[];
  defaultValue?: string | null;
  value?: string | null;
  onChange?: (sessionId: string) => void;
  name?: string;
  label?: string;
  disabled?: boolean;
}

export function SessionSelect({
  sessions,
  defaultValue,
  value,
  onChange,
  name = "sessionId",
  label = "Session",
  disabled = false,
}: SessionSelectProps) {
  const [search, setSearch] = useState("");
  const [internalSelectedId, setInternalSelectedId] = useState<string>(defaultValue || "");
  const selectedId = value !== undefined ? (value || "") : internalSelectedId;
  const setSelectedId = (id: string) => {
    if (onChange) {
      onChange(id);
    } else {
      setInternalSelectedId(id);
    }
  };
  const [isOpen, setIsOpen] = useState(false);

  const filteredSessions = useMemo(() => {
    if (!search) return sessions;
    const searchLower = search.toLowerCase();
    return sessions.filter(
      ({ session, event }) =>
        session.sessionName.toLowerCase().includes(searchLower) ||
        event?.eventName.toLowerCase().includes(searchLower)
    );
  }, [sessions, search]);

  const selectedSession = sessions.find((s) => s.session.id === selectedId);

  const getHierarchyLabel = (item: SessionWithHierarchy) => {
    const parts = [];
    if (item.event) parts.push(item.event.eventName);
    parts.push(item.session.sessionName);
    return parts.join(" > ");
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <div className="relative">
        <input
          type="text"
          placeholder="Search by event or session..."
          value={isOpen ? search : (selectedSession ? getHierarchyLabel(selectedSession) : "")}
          onChange={(e) => {
            setSearch(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => { if (!disabled) setIsOpen(true); }}
          disabled={disabled}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
        />

        {/* Hidden input for form submission */}
        <input type="hidden" name={name} value={selectedId} />

        {/* Dropdown */}
        {isOpen && !disabled && (
          <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
            <div
              className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
              onClick={() => {
                setSelectedId("");
                setSearch("");
                setIsOpen(false);
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
                    selectedId === item.session.id ? "bg-accent" : ""
                  }`}
                  onClick={() => {
                    setSelectedId(item.session.id);
                    setSearch("");
                    setIsOpen(false);
                  }}
                >
                  <div className="font-medium">{item.session.sessionName}</div>
                  <div className="text-xs text-muted-foreground">
                    {[
                      item.event?.eventName,
                      item.session.sessionDate && formatDate(item.session.sessionDate),
                    ].filter(Boolean).join(" · ")}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected session details */}
      {selectedSession && !isOpen && (
        <div className="text-xs text-muted-foreground mt-1.5 space-y-0.5 pl-1">
          <div className="flex flex-wrap gap-x-3">
            {selectedSession.event && (
              <span>
                <span className="opacity-50">Event:</span>{" "}
                <a
                  href={`/events/${selectedSession.event.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600"
                >
                  {selectedSession.event.eventName}
                </a>
              </span>
            )}
            {selectedSession.session.sessionDate && (
              <span><span className="opacity-50">Date:</span> {formatDate(selectedSession.session.sessionDate)}</span>
            )}
          </div>
          <div>
            <span className="opacity-50">ID:</span>{" "}
            <a
              href={`/sessions/${selectedSession.session.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[10px] hover:text-blue-600"
            >
              {selectedSession.session.id}
            </a>
          </div>
        </div>
      )}

      {/* Backdrop to close dropdown */}
      {isOpen && !disabled && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
