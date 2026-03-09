"use client";

import { useState } from "react";
import Link from "next/link";
import type { Event } from "@/lib/db/schema";
import { formatDate, formatDateRange, getDateMeta } from "@/lib/utils";

interface Session {
  id: string;
  sessionName: string;
  sessionDate: string | null;
}

interface ChildEvent {
  id: string;
  eventName: string;
  eventType: string | null;
  eventDateStart: string | null;
}

interface VisibleColumns {
  eventName: boolean;
  type: boolean;
  format: boolean;
  dateRange: boolean;
  topic: boolean;
  category: boolean;
  hostOrg: boolean;
  childEvents: boolean;
  sessions: boolean;
  assets: boolean;
  status: boolean;
}

interface ExpandableEventRowProps {
  event: Event;
  parentEventName: string | null;
  organizerName: string | null;
  hostOrgName: string | null;
  childEventCount: number;
  sessionCount: number;
  assetCount: number;
  topicNames: string | null;
  categoryNames: string | null;
  index: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  visibleColumns?: VisibleColumns;
}

const defaultVisibleColumns: VisibleColumns = {
  eventName: true,
  type: true,
  format: false,
  dateRange: true,
  topic: false,
  category: false,
  hostOrg: false,
  childEvents: true,
  sessions: true,
  assets: true,
  status: true,
};

const FORMAT_LABELS: Record<string, string> = {
  single_recording: "Single Recording",
  series: "Series",
  retreat: "Retreat",
  collection: "Collection",
};

export function ExpandableEventRow({
  event,
  parentEventName,
  organizerName,
  hostOrgName,
  childEventCount,
  sessionCount,
  assetCount,
  topicNames,
  categoryNames,
  index,
  isSelected,
  onToggleSelect,
  visibleColumns = defaultVisibleColumns,
}: ExpandableEventRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [childEvents, setChildEvents] = useState<ChildEvent[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const hasChildren = childEventCount > 0 || sessionCount > 0;

  const handleRowClick = async () => {
    if (!isExpanded && hasChildren && childEvents.length === 0 && sessions.length === 0) {
      setIsLoading(true);
      try {
        const promises = [];

        if (childEventCount > 0) {
          promises.push(
            fetch(`/api/events/${event.id}/children`).then(res => res.json())
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        if (sessionCount > 0) {
          promises.push(
            fetch(`/api/events/${event.id}/sessions`).then(res => res.json())
          );
        } else {
          promises.push(Promise.resolve([]));
        }

        const [childEventsData, sessionsData] = await Promise.all(promises);
        setChildEvents(childEventsData);
        setSessions(sessionsData);
      } catch (error) {
        console.error("Failed to fetch children:", error);
      } finally {
        setIsLoading(false);
      }
    }
    setIsExpanded(!isExpanded);
  };

  return (
    <>
      <tr
        className="border-b hover:bg-muted/50 cursor-pointer"
        onClick={handleRowClick}
      >
        {onToggleSelect && (
          <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={isSelected || false}
              onChange={onToggleSelect}
              className="h-4 w-4 rounded border-gray-300"
            />
          </td>
        )}
        <td className="px-4 py-3 text-sm text-muted-foreground">
          {hasChildren && (
            <span className="mr-2">{isExpanded ? "▼" : "▶"}</span>
          )}
          {index + 1}
        </td>
        {visibleColumns.eventName && (
          <td className="px-4 py-3 text-sm">
            <div>
              {event.eventName}
              {parentEventName && (
                <div className="text-xs text-muted-foreground italic mt-0.5">
                  ↑ {parentEventName}
                </div>
              )}
            </div>
          </td>
        )}
        {visibleColumns.type && (
          <td className="px-4 py-3 text-sm">{event.eventType || "—"}</td>
        )}
        {visibleColumns.format && (
          <td className="px-4 py-3 text-sm">
            {event.eventFormat ? (
              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-indigo-100 text-indigo-700">
                {FORMAT_LABELS[event.eventFormat] || event.eventFormat}
              </span>
            ) : "—"}
          </td>
        )}
        {visibleColumns.dateRange && (
          <td className="px-4 py-3 text-sm">
            {formatDateRange(event.eventDateStart, event.eventDateEnd, getDateMeta(event.additionalMetadata))}
          </td>
        )}
        {visibleColumns.topic && (
          <td className="px-4 py-3 text-sm">{topicNames || "—"}</td>
        )}
        {visibleColumns.category && (
          <td className="px-4 py-3 text-sm">{categoryNames || "—"}</td>
        )}
        {visibleColumns.hostOrg && (
          <td className="px-4 py-3 text-sm">{hostOrgName || "—"}</td>
        )}
        {visibleColumns.childEvents && (
          <td className="px-4 py-3 text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                childEventCount > 0
                  ? "bg-orange-100 text-orange-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {childEventCount}
            </span>
          </td>
        )}
        {visibleColumns.sessions && (
          <td className="px-4 py-3 text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                sessionCount > 0
                  ? "bg-purple-100 text-purple-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {sessionCount}
            </span>
          </td>
        )}
        {visibleColumns.assets && (
          <td className="px-4 py-3 text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                assetCount > 0
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {assetCount}
            </span>
          </td>
        )}
        {visibleColumns.status && (
          <td className="px-4 py-3 text-sm">
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                event.catalogingStatus === "Ready"
                  ? "bg-green-100 text-green-700"
                  : event.catalogingStatus === "In Progress"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {event.catalogingStatus || "Not Started"}
            </span>
          </td>
        )}
        <td className="px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
          <Link
            href={`/events/${event.id}`}
            className="text-blue-600 hover:underline"
          >
            View
          </Link>
        </td>
      </tr>
      {isExpanded && hasChildren && (
        <tr>
          <td colSpan={12} className="px-4 py-2 bg-muted/30">
            {isLoading ? (
              <div className="text-sm text-muted-foreground py-2">
                Loading...
              </div>
            ) : (
              <div className="pl-8 py-2 space-y-4">
                {childEventCount > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      Child Events ({childEventCount}):
                    </div>
                    <div className="space-y-1">
                      {childEvents.map((childEvent) => (
                        <div key={childEvent.id} className="text-sm">
                          <Link
                            href={`/events/${childEvent.id}`}
                            className="text-orange-600 hover:underline inline-flex items-center gap-2"
                          >
                            <span>{childEvent.eventName}</span>
                            {childEvent.eventType && (
                              <span className="text-xs text-muted-foreground">
                                ({childEvent.eventType})
                              </span>
                            )}
                            {childEvent.eventDateStart && (
                              <span className="text-xs text-muted-foreground">
                                - {formatDate(childEvent.eventDateStart)}
                              </span>
                            )}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sessionCount > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">
                      Sessions ({sessionCount}):
                    </div>
                    <div className="space-y-1">
                      {sessions.map((session) => (
                        <div key={session.id} className="text-sm">
                          <Link
                            href={`/sessions/${session.id}`}
                            className="text-blue-600 hover:underline inline-flex items-center gap-2"
                          >
                            <span>{session.sessionName}</span>
                            {session.sessionDate && (
                              <span className="text-xs text-muted-foreground">
                                ({session.sessionDate})
                              </span>
                            )}
                          </Link>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
