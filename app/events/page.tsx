import { db } from "@/lib/db/client";
import { events, organizations } from "@/lib/db/schema";
import { asc, desc, ilike, eq, and, sql, gte, lte } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/pagination";
import { EventFilters } from "@/components/event-filters";
import { EventsPageClient } from "@/components/events-page-client";

export const dynamic = "force-dynamic";

export default async function EventsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    status?: string;
    type?: string;
    format?: string;
    view?: string;
    source?: string;
    organizer?: string;
    hostingCenter?: string;
    country?: string;
    locationRaw?: string;
    metadataSearch?: string;
    dateFrom?: string;
    dateTo?: string;
    dateExact?: string;
    topic?: string;
    category?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  };
}) {
  const search = searchParams.search || "";
  const statusFilter = searchParams.status || "";
  const typeFilter = searchParams.type || "";
  const formatFilter = searchParams.format || "";
  const viewFilter = searchParams.view || "all"; // Default to all events
  const sourceFilter = searchParams.source || "";
  const organizerFilter = searchParams.organizer || "";
  const hostingCenterFilter = searchParams.hostingCenter || "";
  const countryFilter = searchParams.country || "";
  const locationRawFilter = searchParams.locationRaw || "";
  const metadataSearch = searchParams.metadataSearch || "";
  const dateFromFilter = searchParams.dateFrom || "";
  const dateToFilter = searchParams.dateTo || "";
  const dateExactFilter = searchParams.dateExact || "";
  const topicFilter = searchParams.topic || "";
  const categoryFilter = searchParams.category || "";
  const sortBy = searchParams.sortBy || "createdAt";
  const sortOrder = searchParams.sortOrder || "desc";
  const page = parseInt(searchParams.page || "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  // Build where conditions
  const conditions = [];

  if (search) {
    conditions.push(
      sql`(
        ${events.eventName} ILIKE ${`%${search}%`}
        OR ${events.eventDateStart}::text ILIKE ${`%${search}%`}
        OR ${events.eventDateEnd}::text ILIKE ${`%${search}%`}
      )`
    );
  }

  if (statusFilter) {
    if (statusFilter === "null") {
      conditions.push(sql`${events.catalogingStatus} IS NULL`);
    } else {
      conditions.push(eq(events.catalogingStatus, statusFilter));
    }
  }

  if (typeFilter) {
    conditions.push(eq(events.eventType, typeFilter));
  }

  if (formatFilter) {
    conditions.push(eq(events.eventFormat, formatFilter));
  }

  if (sourceFilter) {
    if (sourceFilter === "null") {
      conditions.push(sql`${events.harvestSource} IS NULL`);
    } else {
      conditions.push(eq(events.harvestSource, sourceFilter));
    }
  }

  // Filter by top-level vs all events
  if (viewFilter === "top-level") {
    conditions.push(sql`${events.parentEventId} IS NULL`);
  }

  // Host org filter
  if (organizerFilter) {
    conditions.push(eq(events.hostOrganizationId, organizerFilter));
  }

  // Additional metadata filters
  if (hostingCenterFilter) {
    conditions.push(sql`${events.additionalMetadata}->>'hosting_center' = ${hostingCenterFilter}`);
  }

  if (countryFilter) {
    conditions.push(sql`${events.additionalMetadata}->>'country_raw' = ${countryFilter}`);
  }

  if (locationRawFilter) {
    conditions.push(sql`${events.additionalMetadata}->>'location_raw' = ${locationRawFilter}`);
  }

  if (metadataSearch) {
    conditions.push(sql`${events.additionalMetadata}::text ILIKE ${`%${metadataSearch}%`}`);
  }

  // Exact date filter - LIKE search on start or end date
  if (dateExactFilter) {
    conditions.push(
      sql`(
        ${events.eventDateStart}::text LIKE ${`%${dateExactFilter}%`}
        OR ${events.eventDateEnd}::text LIKE ${`%${dateExactFilter}%`}
      )`
    );
  }

  // Date range filter
  if (dateFromFilter) {
    conditions.push(gte(events.eventDateStart, dateFromFilter));
  }
  if (dateToFilter) {
    conditions.push(lte(events.eventDateStart, dateToFilter));
  }

  // Topic filter (comma-delimited field, use ILIKE for partial match)
  if (topicFilter) {
    conditions.push(ilike(events.topic, `%${topicFilter}%`));
  }

  // Category filter (comma-delimited field, use ILIKE for partial match)
  if (categoryFilter) {
    conditions.push(ilike(events.category, `%${categoryFilter}%`));
  }

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(events)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalPages = Math.ceil(count / perPage);

  // Get events with asset counts, session counts, child event counts, parent event name, and organizer name
  const eventsList = await db
    .select({
      event: events,
      parentEventName: sql<string>`
        (SELECT e2.event_name
         FROM events e2
         WHERE e2.id = events.parent_event_id)
      `.as('parent_event_name'),
      organizerName: sql<string>`
        (SELECT o.name
         FROM organizations o
         WHERE o.id = events.organizer_organization_id)
      `.as('organizer_name'),
      hostOrgName: sql<string>`
        (SELECT o.name
         FROM organizations o
         WHERE o.id = events.host_organization_id)
      `.as('host_org_name'),
      sessionCount: sql<number>`
        COALESCE(
          (SELECT COUNT(*)
           FROM sessions s
           WHERE s.event_id = events.id
          ), 0
        )::int
      `.as('session_count'),
      assetCount: sql<number>`
        COALESCE(
          (SELECT COUNT(DISTINCT a.id)
           FROM archive_assets a
           WHERE a.event_id = events.id
              OR a.session_id IN (SELECT s.id FROM sessions s WHERE s.event_id = events.id)
          ), 0
        )::int
      `.as('asset_count'),
      childEventCount: sql<number>`
        COALESCE(
          (SELECT COUNT(*)
           FROM events e
           WHERE e.parent_event_id = events.id
          ), 0
        )::int
      `.as('child_event_count'),
    })
    .from(events)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy((() => {
      // Handle special cases for sorting by related fields
      if (sortBy === "hostOrg") {
        const hostOrgSort = sql`(SELECT o.name FROM organizations o WHERE o.id = events.host_organization_id)`;
        return sortOrder === "asc" ? asc(hostOrgSort) : desc(hostOrgSort);
      }
      const col = {
        eventName: events.eventName,
        eventDateStart: events.eventDateStart,
        eventDateEnd: events.eventDateEnd,
        topic: events.topic,
        category: events.category,
        createdAt: events.createdAt,
      }[sortBy] || events.createdAt;
      return sortOrder === "asc" ? asc(col) : desc(col);
    })())
    .limit(perPage)
    .offset(offset);

  // Fetch distinct values for filter dropdowns + organizations for bulk edit
  const [types, organizers, hostingCenters, countries, locationTexts, allOrganizations, distinctTopics, distinctCategories] = await Promise.all([
    // Distinct event types
    db
      .selectDistinct({ type: events.eventType })
      .from(events)
      .where(sql`${events.eventType} IS NOT NULL AND ${events.eventType} != ''`)
      .orderBy(events.eventType),

    // Distinct organizers (organizations referenced by events.organizer_organization_id)
    db
      .selectDistinct({ id: organizations.id, name: organizations.name })
      .from(organizations)
      .innerJoin(events, eq(events.organizerOrganizationId, organizations.id))
      .orderBy(organizations.name),

    // Distinct hosting_center values from additional_metadata
    db
      .selectDistinct({
        value: sql<string>`${events.additionalMetadata}->>'hosting_center'`,
      })
      .from(events)
      .where(sql`${events.additionalMetadata}->>'hosting_center' IS NOT NULL AND ${events.additionalMetadata}->>'hosting_center' != ''`)
      .orderBy(sql`${events.additionalMetadata}->>'hosting_center'`),

    // Distinct country_raw values from additional_metadata
    db
      .selectDistinct({
        value: sql<string>`${events.additionalMetadata}->>'country_raw'`,
      })
      .from(events)
      .where(sql`${events.additionalMetadata}->>'country_raw' IS NOT NULL AND ${events.additionalMetadata}->>'country_raw' != ''`)
      .orderBy(sql`${events.additionalMetadata}->>'country_raw'`),

    // Distinct location_raw values from additional_metadata
    db
      .selectDistinct({
        value: sql<string>`${events.additionalMetadata}->>'location_raw'`,
      })
      .from(events)
      .where(sql`${events.additionalMetadata}->>'location_raw' IS NOT NULL AND ${events.additionalMetadata}->>'location_raw' != ''`)
      .orderBy(sql`${events.additionalMetadata}->>'location_raw'`),

    // All organizations for bulk edit modal
    db
      .select({ id: organizations.id, code: organizations.code, name: organizations.name })
      .from(organizations)
      .orderBy(organizations.name),

    // Distinct topics
    db
      .selectDistinct({ topic: events.topic })
      .from(events)
      .where(sql`${events.topic} IS NOT NULL AND ${events.topic} != ''`)
      .orderBy(events.topic),

    // Distinct categories
    db
      .selectDistinct({ category: events.category })
      .from(events)
      .where(sql`${events.category} IS NOT NULL AND ${events.category} != ''`)
      .orderBy(events.category),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Events</h1>
          <p className="text-muted-foreground">
            Manage collection events (retreats, teachings, etc.)
          </p>
        </div>
        <Button asChild>
          <Link href="/events/new">Create Event</Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <EventFilters
        search={search}
        viewFilter={viewFilter}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        formatFilter={formatFilter}
        sourceFilter={sourceFilter}
        organizerFilter={organizerFilter}
        hostingCenterFilter={hostingCenterFilter}
        countryFilter={countryFilter}
        locationRawFilter={locationRawFilter}
        metadataSearch={metadataSearch}
        dateFromFilter={dateFromFilter}
        dateToFilter={dateToFilter}
        dateExactFilter={dateExactFilter}
        topicFilter={topicFilter}
        categoryFilter={categoryFilter}
        availableTypes={types}
        availableOrganizers={allOrganizations}
        availableHostingCenters={hostingCenters.map((h) => h.value).filter(Boolean)}
        availableCountries={countries.map((c) => c.value).filter(Boolean)}
        availableLocationTexts={locationTexts.map((l) => l.value).filter(Boolean)}
        availableTopics={distinctTopics.map((t) => t.topic).filter(Boolean) as string[]}
        availableCategories={distinctCategories.map((c) => c.category).filter(Boolean) as string[]}
      />

      {/* Results Info */}
      <div className="text-sm text-muted-foreground">
        Showing {offset + 1}-{Math.min(offset + perPage, count)} of {count} events
        {search && ` matching "${search}"`}
      </div>

      <EventsPageClient
        eventsList={eventsList}
        organizations={allOrganizations}
        availableTypes={types.map((t) => t.type).filter(Boolean) as string[]}
        offset={offset}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchParams={searchParams}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/events"
        searchParams={{
          ...(search && { search }),
          ...(viewFilter !== "all" && { view: viewFilter }),
          ...(statusFilter && { status: statusFilter }),
          ...(typeFilter && { type: typeFilter }),
          ...(formatFilter && { format: formatFilter }),
          ...(sourceFilter && { source: sourceFilter }),
          ...(organizerFilter && { organizer: organizerFilter }),
          ...(hostingCenterFilter && { hostingCenter: hostingCenterFilter }),
          ...(countryFilter && { country: countryFilter }),
          ...(locationRawFilter && { locationRaw: locationRawFilter }),
          ...(metadataSearch && { metadataSearch }),
          ...(dateFromFilter && { dateFrom: dateFromFilter }),
          ...(dateToFilter && { dateTo: dateToFilter }),
          ...(dateExactFilter && { dateExact: dateExactFilter }),
          ...(topicFilter && { topic: topicFilter }),
          ...(categoryFilter && { category: categoryFilter }),
          ...(sortBy !== "createdAt" && { sortBy }),
          ...(sortOrder !== "desc" && { sortOrder }),
        }}
      />
    </div>
  );
}
