import { db } from "@/lib/db/client";
import { collection, event, collectionItem } from "@/lib/db/schema";
import { asc, desc, eq, and, sql, isNull } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

export default async function CollectionsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    scope?: string;
    visibility?: string;
    eventId?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  };
}) {
  const search = searchParams.search || "";
  const scopeFilter = searchParams.scope || "";
  const visibilityFilter = searchParams.visibility || "";
  const eventIdFilter = searchParams.eventId || "";
  const sortBy = searchParams.sortBy || "createdAt";
  const sortOrder = searchParams.sortOrder || "desc";
  const page = parseInt(searchParams.page || "1");
  const perPage = 25;
  const offset = (page - 1) * perPage;

  // Build where conditions
  const conditions = [isNull(collection.deletedAt)];

  if (search) {
    conditions.push(
      sql`(
        ${collection.name} ILIKE ${`%${search}%`}
        OR ${collection.description} ILIKE ${`%${search}%`}
      )`
    );
  }

  if (scopeFilter) {
    conditions.push(eq(collection.scope, scopeFilter));
  }

  if (visibilityFilter) {
    conditions.push(eq(collection.visibility, visibilityFilter));
  }

  if (eventIdFilter) {
    conditions.push(eq(collection.eventId, eventIdFilter));
  }

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(collection)
    .where(and(...conditions));

  const totalPages = Math.ceil(count / perPage);

  // Get collections with event name and item count
  const collectionsList = await db
    .select({
      collection: collection,
      eventName: sql<string>`
        (SELECT e.event_name FROM event e WHERE e.id = ${collection.eventId})
      `.as("event_name"),
      itemCount: sql<number>`
        (SELECT COUNT(*) FROM collection_item ci WHERE ci.collection_id = ${collection.id})::int
      `.as("item_count"),
    })
    .from(collection)
    .where(and(...conditions))
    .orderBy(() => {
      const col = {
        name: collection.name,
        scope: collection.scope,
        visibility: collection.visibility,
        createdAt: collection.createdAt,
        updatedAt: collection.updatedAt,
      }[sortBy] || collection.createdAt;
      return sortOrder === "asc" ? asc(col) : desc(col);
    })
    .limit(perPage)
    .offset(offset);

  // Get distinct values for filters
  const [scopes, visibilities, eventsWithCollections] = await Promise.all([
    db
      .selectDistinct({ scope: collection.scope })
      .from(collection)
      .where(isNull(collection.deletedAt))
      .orderBy(collection.scope),
    db
      .selectDistinct({ visibility: collection.visibility })
      .from(collection)
      .where(isNull(collection.deletedAt))
      .orderBy(collection.visibility),
    db
      .selectDistinct({
        id: event.id,
        name: event.eventName,
      })
      .from(event)
      .innerJoin(collection, eq(collection.eventId, event.id))
      .where(isNull(collection.deletedAt))
      .orderBy(event.eventName),
  ]);

  const scopeBadgeColor = (scope: string) => {
    switch (scope) {
      case "event":
        return "bg-blue-100 text-blue-800";
      case "user":
        return "bg-purple-100 text-purple-800";
      case "editorial":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const visibilityBadgeColor = (visibility: string) => {
    switch (visibility) {
      case "public":
        return "bg-green-100 text-green-800";
      case "shared":
        return "bg-yellow-100 text-yellow-800";
      case "private":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collections</h1>
          <p className="text-muted-foreground">
            Manage viewing order collections for events
          </p>
        </div>
      </div>

      {/* Filters */}
      <form className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="text-sm font-medium mb-1 block">Search</label>
          <input
            type="text"
            name="search"
            defaultValue={search}
            placeholder="Search by name or description..."
            className="w-full px-3 py-2 border rounded-md"
          />
        </div>

        <div className="w-40">
          <label className="text-sm font-medium mb-1 block">Scope</label>
          <select
            name="scope"
            defaultValue={scopeFilter}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">All Scopes</option>
            {scopes.map((s) => (
              <option key={s.scope} value={s.scope}>
                {s.scope}
              </option>
            ))}
          </select>
        </div>

        <div className="w-40">
          <label className="text-sm font-medium mb-1 block">Visibility</label>
          <select
            name="visibility"
            defaultValue={visibilityFilter}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">All</option>
            {visibilities.map((v) => (
              <option key={v.visibility} value={v.visibility}>
                {v.visibility}
              </option>
            ))}
          </select>
        </div>

        <div className="w-64">
          <label className="text-sm font-medium mb-1 block">Event</label>
          <select
            name="eventId"
            defaultValue={eventIdFilter}
            className="w-full px-3 py-2 border rounded-md"
          >
            <option value="">All Events</option>
            {eventsWithCollections.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <Button type="submit">Filter</Button>
        <Button variant="outline" asChild>
          <Link href="/collections">Clear</Link>
        </Button>
      </form>

      {/* Results Info */}
      <div className="text-sm text-muted-foreground">
        Showing {offset + 1}-{Math.min(offset + perPage, count)} of {count}{" "}
        collections
        {search && ` matching "${search}"`}
      </div>

      {/* Collections Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Event</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Scope</th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Visibility
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">Items</th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Default
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium">
                Updated
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {collectionsList.map(({ collection: c, eventName, itemCount }) => (
              <tr key={c.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/collections/${c.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {c.name}
                  </Link>
                  {c.description && (
                    <p className="text-sm text-muted-foreground truncate max-w-md">
                      {c.description}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3">
                  {c.eventId ? (
                    <Link
                      href={`/events/${c.eventId}`}
                      className="text-sm hover:underline"
                    >
                      {eventName || c.eventId.slice(0, 8)}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge className={scopeBadgeColor(c.scope)} variant="outline">
                    {c.scope}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    className={visibilityBadgeColor(c.visibility)}
                    variant="outline"
                  >
                    {c.visibility}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-sm">{itemCount}</td>
                <td className="px-4 py-3">
                  {c.isDefault ? (
                    <Badge className="bg-green-100 text-green-800">Yes</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {c.updatedAt.toLocaleDateString()}
                </td>
              </tr>
            ))}
            {collectionsList.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No collections found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/collections"
        searchParams={{
          ...(search && { search }),
          ...(scopeFilter && { scope: scopeFilter }),
          ...(visibilityFilter && { visibility: visibilityFilter }),
          ...(eventIdFilter && { eventId: eventIdFilter }),
          ...(sortBy !== "createdAt" && { sortBy }),
          ...(sortOrder !== "desc" && { sortOrder }),
        }}
      />
    </div>
  );
}
