import { db } from "@/lib/db/client";
import { organizations, locations, organizationLocations, locationAddresses, addresses, events } from "@/lib/db/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { deleteOrganization } from "@/lib/actions";
import { formatDateRange, getDateMeta } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function OrganizationDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, params.id))
    .limit(1);

  if (!organization) {
    notFound();
  }

  // Get locations for this organization via organization_locations junction table
  // Include the primary address for each location
  const linkedLocations = await db
    .select({
      linkId: organizationLocations.id,
      isPrimary: organizationLocations.isPrimary,
      role: organizationLocations.role,
      locationId: locations.id,
      locationCode: locations.code,
      locationName: locations.name,
      locationType: locations.locationType,
      isOnline: locations.isOnline,
      // Primary address info (if any)
      city: addresses.city,
      stateProvince: addresses.stateProvince,
      country: addresses.country,
    })
    .from(organizationLocations)
    .innerJoin(locations, eq(organizationLocations.locationId, locations.id))
    .leftJoin(locationAddresses, and(
      eq(locationAddresses.locationId, locations.id),
      eq(locationAddresses.isPrimary, true)
    ))
    .leftJoin(addresses, eq(locationAddresses.addressId, addresses.id))
    .where(eq(organizationLocations.organizationId, params.id));

  // Sort: primary first, then by role
  linkedLocations.sort((a, b) => {
    if (a.isPrimary && !b.isPrimary) return -1;
    if (!a.isPrimary && b.isPrimary) return 1;
    return (a.role || "").localeCompare(b.role || "");
  });

  // Get events where this org is host, organizer, or online host (limit to 10 most recent)
  const orgEvents = await db
    .select({
      id: events.id,
      eventName: events.eventName,
      eventType: events.eventType,
      eventDateStart: events.eventDateStart,
      eventDateEnd: events.eventDateEnd,
      catalogingStatus: events.catalogingStatus,
      additionalMetadata: events.additionalMetadata,
      role: sql<string>`
        CASE
          WHEN ${events.hostOrganizationId} = ${params.id} THEN 'Host'
          WHEN ${events.organizerOrganizationId} = ${params.id} THEN 'Organizer'
          WHEN ${events.onlineHostOrganizationId} = ${params.id} THEN 'Online Host'
        END
      `.as('role'),
    })
    .from(events)
    .where(
      or(
        eq(events.hostOrganizationId, params.id),
        eq(events.organizerOrganizationId, params.id),
        eq(events.onlineHostOrganizationId, params.id)
      )
    )
    .orderBy(desc(events.eventDateStart))
    .limit(10);

  // Get total count of events for this org
  const [{ eventCount }] = await db
    .select({ eventCount: sql<number>`count(*)::int` })
    .from(events)
    .where(
      or(
        eq(events.hostOrganizationId, params.id),
        eq(events.organizerOrganizationId, params.id),
        eq(events.onlineHostOrganizationId, params.id)
      )
    );

  // Build breadcrumbs
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Orgs", href: "/organizations" },
    { label: organization.name },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Breadcrumbs items={breadcrumbItems} />
          <h1 className="text-3xl font-bold">{organization.name}</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">
            {organization.code}
          </p>
        </div>
        <Button asChild>
          <Link href={`/organizations/${params.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Code</dt>
                <dd className="text-sm mt-1 font-mono">{organization.code}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Name</dt>
                <dd className="text-sm mt-1">{organization.name}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">Organization Type</dt>
                <dd className="text-sm mt-1">
                  {organization.orgType ? (
                    <Badge variant="secondary">{organization.orgType}</Badge>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {organization.alternativeNames && organization.alternativeNames.length > 0 && (
                <div className="md:col-span-2">
                  <dt className="text-sm font-medium text-muted-foreground">Alternative Names</dt>
                  <dd className="text-sm mt-1 flex flex-wrap gap-2">
                    {organization.alternativeNames.map((name, idx) => (
                      <Badge key={idx} variant="outline">
                        {name}
                      </Badge>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Locations (via organization_locations junction table) */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Locations ({linkedLocations.length})</h2>
              <div className="flex gap-2">
                <Button size="sm" asChild>
                  <Link href={`/organizations/${params.id}/locations/link`}>Link Location</Link>
                </Button>
              </div>
            </div>
            {linkedLocations.length > 0 ? (
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">City</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Country</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Primary</th>
                      <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linkedLocations.map((loc) => (
                      <tr key={loc.linkId} className="border-b hover:bg-muted/50">
                        <td className="px-4 py-3 text-sm font-medium">
                          {loc.locationName}
                          {loc.isOnline && (
                            <Badge variant="outline" className="ml-2 text-xs">Online</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {loc.locationType ? (
                            <Badge variant="outline" className="text-xs">{loc.locationType}</Badge>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">{loc.city || "—"}</td>
                        <td className="px-4 py-3 text-sm">{loc.country || "—"}</td>
                        <td className="px-4 py-3 text-sm">
                          {loc.isPrimary ? (
                            <Badge variant="default" className="text-xs">Primary</Badge>
                          ) : "—"}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Link
                            href={`/locations/${loc.locationId}`}
                            className="text-blue-600 hover:underline"
                          >
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
                <p>No locations linked yet</p>
                <p className="text-xs mt-1">Click &quot;Link Location&quot; to add one</p>
              </div>
            )}
          </div>

          {/* Events */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Events ({eventCount})</h2>
              {eventCount > 10 && (
                <Button size="sm" variant="outline" asChild>
                  <Link href={`/events?organizer=${params.id}`}>View All</Link>
                </Button>
              )}
            </div>
            {orgEvents.length > 0 ? (
              <>
                <div className="rounded-md border">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="px-4 py-3 text-left text-sm font-medium">Event Name</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                        <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orgEvents.map((event) => (
                        <tr key={event.id} className="border-b hover:bg-muted/50">
                          <td className="px-4 py-3 text-sm font-medium">
                            <Link
                              href={`/events/${event.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              {event.eventName}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-sm">{event.eventType || "—"}</td>
                          <td className="px-4 py-3 text-sm">
                            {formatDateRange(event.eventDateStart, event.eventDateEnd, getDateMeta(event.additionalMetadata))}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                event.role === "Host"
                                  ? "bg-purple-50 text-purple-700 border-purple-200"
                                  : event.role === "Online Host"
                                  ? "bg-cyan-50 text-cyan-700 border-cyan-200"
                                  : "bg-gray-50 text-gray-700 border-gray-200"
                              }`}
                            >
                              {event.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {event.catalogingStatus ? (
                              <Badge variant="outline" className="text-xs">
                                {event.catalogingStatus}
                              </Badge>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <Link
                              href={`/events/${event.id}`}
                              className="text-blue-600 hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {eventCount > 10 && (
                  <p className="text-xs text-muted-foreground mt-3 text-center">
                    Showing 10 most recent events.{" "}
                    <Link href={`/events?organizer=${params.id}`} className="text-blue-600 hover:underline">
                      View all {eventCount} events
                    </Link>
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No events associated with this organization</p>
              </div>
            )}
          </div>

          {/* Description */}
          {organization.description && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Description</h2>
              <p className="text-sm">{organization.description}</p>
            </div>
          )}
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Metadata</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Created</dt>
                <dd className="text-sm mt-1">
                  {new Date(organization.createdAt).toLocaleDateString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Last Updated</dt>
                <dd className="text-sm mt-1">
                  {new Date(organization.updatedAt).toLocaleDateString()}
                </dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          {organization.notes && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <p className="text-sm">{organization.notes}</p>
            </div>
          )}

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/50 p-6">
            <h2 className="text-xl font-semibold mb-2 text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting this organization is permanent and cannot be undone.
            </p>
            <form action={deleteOrganization.bind(null, params.id)}>
              <Button type="submit" variant="destructive" size="sm">
                Delete Organization
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
