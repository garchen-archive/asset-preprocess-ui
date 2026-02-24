import { db } from "@/lib/db/client";
import { events, sessions, topics, categories, eventTopics, eventCategories, archiveAssets, organizations, addresses, venues, locations } from "@/lib/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { deleteEvent } from "@/lib/actions";
import { formatDate, getDateMeta, type DateMeta } from "@/lib/utils";

export const dynamic = "force-dynamic";

function renderTextWithLinks(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    part.match(urlRegex) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">
        {part}
      </a>
    ) : (
      <span key={i}>{part}</span>
    )
  );
}

export default async function EventDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [event] = await db
    .select()
    .from(events)
    .where(eq(events.id, params.id))
    .limit(1);

  if (!event) {
    notFound();
  }

  // Extract date metadata for display
  const dateMeta = getDateMeta(event.additionalMetadata);

  // Get sessions in this event
  const eventSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.eventId, params.id));

  // Get assets directly assigned to this event (no session)
  const directEventAssets = await db
    .select({
      id: archiveAssets.id,
      title: archiveAssets.title,
      name: archiveAssets.name,
      assetType: archiveAssets.assetType,
      duration: archiveAssets.duration,
      sessionId: archiveAssets.sessionId,
      catalogingStatus: archiveAssets.catalogingStatus,
    })
    .from(archiveAssets)
    .where(eq(archiveAssets.eventId, params.id));

  // Get all assets from all sessions in this event
  const sessionIds = eventSessions.map(s => s.id);
  const sessionAssets = sessionIds.length > 0
    ? await db
        .select({
          id: archiveAssets.id,
          title: archiveAssets.title,
          name: archiveAssets.name,
          assetType: archiveAssets.assetType,
          duration: archiveAssets.duration,
          sessionId: archiveAssets.sessionId,
          catalogingStatus: archiveAssets.catalogingStatus,
        })
        .from(archiveAssets)
        .where(inArray(archiveAssets.sessionId, sessionIds))
    : [];

  const totalAssetCount = directEventAssets.length + sessionAssets.length;

  // Get host organization if exists
  const hostOrg = event.hostOrganizationId
    ? await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, event.hostOrganizationId))
        .limit(1)
        .then((results) => results[0] || null)
    : null;

  // Get organizer organization if exists
  const organizerOrg = event.organizerOrganizationId
    ? await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, event.organizerOrganizationId))
        .limit(1)
        .then((results) => results[0] || null)
    : null;

  // Get online host organization if exists
  const onlineHostOrg = event.onlineHostOrganizationId
    ? await db
        .select()
        .from(organizations)
        .where(eq(organizations.id, event.onlineHostOrganizationId))
        .limit(1)
        .then((results) => results[0] || null)
    : null;

  // Get venue with location and address details
  const venue = event.venueId
    ? await db
        .select({
          id: venues.id,
          spaceLabel: venues.spaceLabel,
          name: venues.name,
          venueType: venues.venueType,
          locationId: locations.id,
          locationName: locations.name,
          locationCode: locations.code,
          isOnline: locations.isOnline,
          addressLabel: addresses.label,
          fullAddress: addresses.fullAddress,
          city: addresses.city,
          stateProvince: addresses.stateProvince,
          country: addresses.country,
        })
        .from(venues)
        .innerJoin(locations, eq(venues.locationId, locations.id))
        .leftJoin(addresses, eq(venues.addressId, addresses.id))
        .where(eq(venues.id, event.venueId))
        .limit(1)
        .then((results) => results[0] || null)
    : null;

  // Get parent event if exists
  const parentEvent = event.parentEventId
    ? await db
        .select()
        .from(events)
        .where(eq(events.id, event.parentEventId))
        .limit(1)
        .then((results) => results[0] || null)
    : null;

  // Get child events
  const childEvents = await db
    .select()
    .from(events)
    .where(eq(events.parentEventId, params.id));

  // Get topics for this event
  const eventTopicsList = await db
    .select({
      id: topics.id,
      name: topics.name,
    })
    .from(eventTopics)
    .innerJoin(topics, eq(eventTopics.topicId, topics.id))
    .where(eq(eventTopics.eventId, params.id));

  // Get categories for this event
  const eventCategoriesList = await db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(eventCategories)
    .innerJoin(categories, eq(eventCategories.categoryId, categories.id))
    .where(eq(eventCategories.eventId, params.id));

  // Build breadcrumbs
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Events", href: "/events" },
  ];

  if (parentEvent) {
    breadcrumbItems.push({
      label: parentEvent.eventName,
      href: `/events/${parentEvent.id}`,
    });
  }

  breadcrumbItems.push({ label: event.eventName });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Breadcrumbs items={breadcrumbItems} />
          <h1 className="text-3xl font-bold">{event.eventName}</h1>
        </div>
        <Button asChild>
          <Link href={`/events/${params.id}/edit`}>Edit</Link>
        </Button>
      </div>

      {/* Parent Event Badge */}
      {parentEvent && (
        <div className="rounded-lg border p-4 bg-blue-50/50 border-blue-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Child event of:</span>
            <Link
              href={`/events/${parentEvent.id}`}
              className="font-medium text-blue-600 hover:underline flex items-center gap-1"
            >
              ↑ {parentEvent.eventName}
            </Link>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Event Details */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Event Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Event Type</dt>
                <dd className="text-sm mt-1">{event.eventType || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Event Format</dt>
                <dd className="text-sm mt-1">
                  {event.eventFormat ? (
                    <Badge variant="outline" className="text-xs">
                      {event.eventFormat === "single_recording" ? "Single Recording" :
                       event.eventFormat === "series" ? "Series" :
                       event.eventFormat === "retreat" ? "Retreat" :
                       event.eventFormat === "collection" ? "Collection" :
                       event.eventFormat}
                    </Badge>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Start Date</dt>
                <dd className="text-sm mt-1">
                  {formatDate(event.eventDateStart, dateMeta?.startPrecision || "day", dateMeta?.qualifier || "exact")}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">End Date</dt>
                <dd className="text-sm mt-1">
                  {formatDate(event.eventDateEnd, dateMeta?.endPrecision || "day", dateMeta?.qualifier || "exact")}
                </dd>
              </div>
            </dl>
          </div>

          {/* Category & Topic */}
          <div className="rounded-lg border p-6 bg-blue-50/50">
            <h2 className="text-xl font-semibold mb-4">Categories & Topics</h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-2">Categories</dt>
                <dd className="flex flex-wrap gap-2">
                  {eventCategoriesList.length > 0 ? (
                    eventCategoriesList.map((cat) => (
                      <Badge key={cat.id} variant="secondary">
                        {cat.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-2">Topics</dt>
                <dd className="flex flex-wrap gap-2">
                  {eventTopicsList.length > 0 ? (
                    eventTopicsList.map((topic) => (
                      <Badge key={topic.id} variant="secondary">
                        {topic.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </div>
            {event.eventDescription && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                <dd className="text-sm mt-1">{event.eventDescription}</dd>
              </div>
            )}
          </div>

          {/* Orgs & Venue */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Orgs & Venue</h2>

            {/* Orgs Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Host Org */}
              <div>
                <dt className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Host</dt>
                {hostOrg ? (
                  <Link
                    href={`/organizations/${hostOrg.id}`}
                    className="block p-3 rounded-md bg-purple-50/50 border border-purple-200 hover:bg-purple-50 transition-colors"
                  >
                    <p className="font-medium text-sm">{hostOrg.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{hostOrg.code}</p>
                  </Link>
                ) : (
                  <p className="text-sm text-muted-foreground p-3 border-2 border-dashed rounded-md">Not set</p>
                )}
              </div>

              {/* Organizer Org - only show if set (de-emphasized, for future use) */}
              {organizerOrg ? (
                <div className="opacity-60">
                  <dt className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Organizer</dt>
                  <Link
                    href={`/organizations/${organizerOrg.id}`}
                    className="block p-3 rounded-md bg-gray-50/50 border border-gray-200 hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-sm">{organizerOrg.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{organizerOrg.code}</p>
                  </Link>
                </div>
              ) : (
                <div /> /* Empty placeholder to maintain grid */
              )}
            </div>

            {/* Online Host Org - only show if set */}
            {onlineHostOrg && (
              <div className="mb-4">
                <dt className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Online Host</dt>
                <Link
                  href={`/organizations/${onlineHostOrg.id}`}
                  className="block p-3 rounded-md bg-cyan-50/50 border border-cyan-200 hover:bg-cyan-50 transition-colors"
                >
                  <p className="font-medium text-sm">{onlineHostOrg.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{onlineHostOrg.code}</p>
                  <p className="text-xs text-cyan-600 mt-1">Handles online streaming/hosting</p>
                </Link>
              </div>
            )}

            {/* Venue */}
            <div className="border-t pt-4">
              <dt className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Venue</dt>
              {venue ? (
                <div className="p-4 rounded-md bg-amber-50/50 border border-amber-200">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-base">
                        <Link href={`/locations/${venue.locationId}`} className="hover:underline">
                          {venue.locationName}
                        </Link>
                        {venue.spaceLabel && (
                          <span className="text-muted-foreground font-normal"> — {venue.spaceLabel}</span>
                        )}
                      </p>
                      {venue.isOnline ? (
                        <p className="text-sm text-blue-600 mt-1">Online venue</p>
                      ) : venue.fullAddress ? (
                        <p className="text-sm text-muted-foreground mt-1">{venue.fullAddress}</p>
                      ) : (venue.city || venue.country) ? (
                        <p className="text-sm text-muted-foreground mt-1">
                          {[venue.city, venue.stateProvince, venue.country].filter(Boolean).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    {venue.venueType && (
                      <Badge variant="secondary" className="text-xs ml-2">
                        {venue.venueType}
                      </Badge>
                    )}
                  </div>
                  {event.spaceLabel && event.spaceLabel !== venue.spaceLabel && (
                    <div className="mt-2 pt-2 border-t border-amber-200">
                      <p className="text-xs text-muted-foreground">
                        Space override: <span className="font-medium">{event.spaceLabel}</span>
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-4 border-2 border-dashed rounded-md text-center">
                  No venue set
                </p>
              )}
            </div>

            {!hostOrg && !onlineHostOrg && !venue && (
              <p className="text-sm text-muted-foreground mt-4">
                <Link href={`/events/${params.id}/edit`} className="text-blue-600 hover:underline">Edit event</Link> to assign orgs or venue.
              </p>
            )}
          </div>

          {/* Child Events */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Child Events ({childEvents.length})</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/events/${params.id}/assign-child`}>Assign Existing</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/events/new?parentEventId=${params.id}`}>Create New</Link>
                </Button>
              </div>
            </div>
            {childEvents.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Start Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">End Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {childEvents.map((childEvent) => (
                      <tr key={childEvent.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/events/${childEvent.id}`} className="font-medium text-blue-600 hover:underline">
                            {childEvent.eventName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">{childEvent.eventType || "—"}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(childEvent.eventDateStart)}</td>
                        <td className="px-4 py-3 text-sm">{formatDate(childEvent.eventDateEnd)}</td>
                        <td className="px-4 py-3 text-sm">
                          {childEvent.catalogingStatus ? (
                            <Badge variant="outline" className="text-xs">{childEvent.catalogingStatus}</Badge>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/events/${childEvent.id}`} className="text-blue-600 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No child events yet</p>
                <p className="text-xs mt-1">Click &quot;Create New&quot; to add one</p>
              </div>
            )}
          </div>

          {/* Sessions in this Event */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Sessions ({eventSessions.length})</h2>
              <Button size="sm" asChild>
                <Link href={`/sessions/new?eventId=${params.id}`}>Add Session</Link>
              </Button>
            </div>
            {eventSessions.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Topic</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventSessions.map((session) => (
                      <tr key={session.id} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/sessions/${session.id}`} className="font-medium text-blue-600 hover:underline">
                            {session.sessionName}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">{session.sessionDate || "—"}</td>
                        <td className="px-4 py-3 text-sm">{session.sessionTime || "—"}</td>
                        <td className="px-4 py-3 text-sm">{session.topic || "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          {session.catalogingStatus ? (
                            <Badge variant="outline" className="text-xs">{session.catalogingStatus}</Badge>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link href={`/sessions/${session.id}`} className="text-blue-600 hover:underline">
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No sessions yet.</p>
            )}
          </div>

          {/* Direct Event Assets */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Direct Event Assets ({directEventAssets.length})</h2>
            </div>
            {directEventAssets.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Assets assigned directly to this event (not through a session)
                </p>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {directEventAssets.map((asset) => (
                        <tr key={asset.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm">
                            <Link href={`/assets/${asset.id}`} className="font-medium text-blue-600 hover:underline">
                              {asset.title || asset.name || "Untitled"}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm">{asset.assetType || "—"}</td>
                          <td className="px-4 py-3 text-sm">{asset.duration || "—"}</td>
                          <td className="px-4 py-3 text-sm">
                            {asset.catalogingStatus ? (
                              <Badge variant="outline" className="text-xs">{asset.catalogingStatus}</Badge>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:underline">
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No assets assigned directly to this event.</p>
            )}
          </div>

          {/* Assets from Sessions */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Session Assets ({sessionAssets.length})</h2>
            </div>
            {sessionAssets.length > 0 ? (
              <>
                <p className="text-xs text-muted-foreground mb-3">
                  Assets assigned to sessions within this event
                </p>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Title</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Session</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessionAssets.map((asset) => {
                        const session = eventSessions.find(s => s.id === asset.sessionId);
                        return (
                          <tr key={asset.id} className="border-b hover:bg-muted/50">
                            <td className="px-4 py-3 text-sm">
                              <Link href={`/assets/${asset.id}`} className="font-medium text-blue-600 hover:underline">
                                {asset.title || asset.name || "Untitled"}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-sm">{asset.assetType || "—"}</td>
                            <td className="px-4 py-3 text-sm">{asset.duration || "—"}</td>
                            <td className="px-4 py-3 text-sm">
                              {session ? (
                                <Link href={`/sessions/${session.id}`} className="text-blue-600 hover:underline text-xs">
                                  {session.sessionName}
                                </Link>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              {asset.catalogingStatus ? (
                                <Badge variant="outline" className="text-xs">{asset.catalogingStatus}</Badge>
                              ) : "—"}
                            </td>
                            <td className="px-4 py-3 text-sm">
                              <Link href={`/assets/${asset.id}`} className="text-blue-600 hover:underline">
                                View
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No session assets yet.</p>
            )}
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Administrative */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Administrative</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm mt-1">
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
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Harvest Source</dt>
                <dd className="text-sm mt-1">
                  {event.harvestSource ? (
                    <Badge variant="outline" className="text-xs">
                      {event.harvestSource}
                    </Badge>
                  ) : "—"}
                </dd>
              </div>
              {event.lastHarvestedAt && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Last Harvested</dt>
                  <dd className="text-sm mt-1">
                    {new Date(event.lastHarvestedAt).toLocaleString()}
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created By</dt>
                <dd className="text-sm mt-1">{event.createdBy || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Child Events</dt>
                <dd className="text-sm mt-1">{childEvents.length}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Session Count</dt>
                <dd className="text-sm mt-1">{eventSessions.length}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Total Asset Count</dt>
                <dd className="text-sm mt-1">
                  {totalAssetCount}
                  {(directEventAssets.length > 0 || sessionAssets.length > 0) && (
                    <span className="text-xs text-muted-foreground ml-1">
                      ({directEventAssets.length} direct + {sessionAssets.length} via sessions)
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Total Duration</dt>
                <dd className="text-sm mt-1">{event.totalDuration || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          {event.notes && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{renderTextWithLinks(event.notes)}</p>
            </div>
          )}

          {/* Sheet Import Metadata */}
          {(() => {
            // Handle both namespaced (sheetImport) and flat (legacy) metadata formats
            const metadata = event.additionalMetadata as Record<string, unknown> | null;
            if (!metadata || Object.keys(metadata).length === 0) return null;

            // Check if metadata is namespaced (has sheetImport key)
            const sheetImportData = metadata.sheetImport as Record<string, unknown> | undefined;

            // Use sheetImport if available, otherwise use all metadata except dateMeta
            const displayData = sheetImportData ||
              Object.fromEntries(
                Object.entries(metadata).filter(([key]) => key !== "dateMeta")
              );

            if (Object.keys(displayData).length === 0) return null;

            return (
              <div className="rounded-lg border p-6">
                <h2 className="text-xl font-semibold mb-4">Raw Import Metadata</h2>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Field</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(displayData)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .map(([key, value]) => (
                          <tr key={key} className="border-b hover:bg-muted/50">
                            <td className="px-3 py-2 text-xs font-mono text-muted-foreground whitespace-nowrap">
                              {key}
                            </td>
                            <td className="px-3 py-2 text-xs break-all whitespace-pre-wrap">
                              {typeof value === "object"
                                ? JSON.stringify(value, null, 2)
                                : renderTextWithLinks(String(value ?? ""))}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/50 p-6">
            <h2 className="text-xl font-semibold mb-2 text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting this event will also delete all associated sessions.
            </p>
            <form action={deleteEvent.bind(null, params.id)}>
              <Button type="submit" variant="destructive" size="sm">
                Delete Event
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
