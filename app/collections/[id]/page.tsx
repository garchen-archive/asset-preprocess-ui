import { db } from "@/lib/db/client";
import { collection, collectionItem, event, eventSession, asset } from "@/lib/db/schema";
import { eq, asc, and, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function CollectionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Get collection with event
  const [collectionData] = await db
    .select({
      collection: collection,
      event: event,
    })
    .from(collection)
    .leftJoin(event, eq(event.id, collection.eventId))
    .where(and(eq(collection.id, params.id), isNull(collection.deletedAt)));

  if (!collectionData) {
    notFound();
  }

  const { collection: c, event: evt } = collectionData;

  // Get collection items with related data
  const items = await db
    .select({
      item: collectionItem,
      sessionName: eventSession.sessionName,
      sessionDate: eventSession.sessionDate,
      assetTitle: asset.title,
    })
    .from(collectionItem)
    .leftJoin(eventSession, eq(eventSession.id, collectionItem.eventSessionId))
    .leftJoin(asset, eq(asset.id, collectionItem.assetId))
    .where(eq(collectionItem.collectionId, params.id))
    .orderBy(asc(collectionItem.sequence));

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
      <Breadcrumbs
        items={[
          { label: "Collections", href: "/collections" },
          ...(evt ? [{ label: `Event: ${evt.eventName}`, href: `/events/${evt.id}` }] : []),
          { label: c.name },
        ]}
      />

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          {evt && (
            <p className="text-sm text-muted-foreground mb-1">
              Collection for{" "}
              <Link href={`/events/${evt.id}`} className="text-primary hover:underline font-medium">
                {evt.eventName}
              </Link>
            </p>
          )}
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">{c.name}</h1>
            {c.isDefault && (
              <Badge className="bg-green-100 text-green-800">Default</Badge>
            )}
          </div>
          {c.description && (
            <p className="text-muted-foreground mt-1">{c.description}</p>
          )}
        </div>
        {/* Edit button hidden - editing done via admin project */}
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg border bg-muted/30">
        <div>
          <p className="text-sm text-muted-foreground">Scope</p>
          <Badge className={scopeBadgeColor(c.scope)} variant="outline">
            {c.scope}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Visibility</p>
          <Badge className={visibilityBadgeColor(c.visibility)} variant="outline">
            {c.visibility}
          </Badge>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Event</p>
          {evt ? (
            <Link href={`/events/${evt.id}`} className="text-primary hover:underline">
              {evt.eventName}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Items</p>
          <p className="font-medium">{items.length}</p>
        </div>
      </div>

      {/* Items Table */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Collection Items</h2>

        {items.length > 0 ? (
          <div className="rounded-lg border">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium w-16">#</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Label</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Session/Asset</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Day</th>
                  <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {items.map(({ item, sessionName, sessionDate, assetTitle }) => (
                  <tr key={item.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {item.sequence}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium">{item.label || "—"}</span>
                      {item.isContinuation && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          Continuation
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.eventSessionId && sessionName && (
                        <Link
                          href={`/sessions/${item.eventSessionId}`}
                          className="text-primary hover:underline"
                        >
                          {sessionName}
                        </Link>
                      )}
                      {item.assetId && assetTitle && (
                        <Link
                          href={`/assets/${item.assetId}`}
                          className="text-primary hover:underline"
                        >
                          {assetTitle}
                        </Link>
                      )}
                      {!sessionName && !assetTitle && (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {item.dayLabel || (item.occurrenceDate ? new Date(item.occurrenceDate).toLocaleDateString() : "—")}
                    </td>
                    <td className="px-4 py-3">
                      {item.playlistRole ? (
                        <Badge variant="outline" className="text-xs">
                          {item.playlistRole}
                        </Badge>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 border rounded-lg bg-muted/10">
            <p className="text-muted-foreground">No items in this collection</p>
            {evt && (
              <p className="text-sm text-muted-foreground mt-2">
                Use the pipeline to generate items from event sessions
              </p>
            )}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="text-sm text-muted-foreground border-t pt-4">
        <p>Created: {c.createdAt.toLocaleString()}</p>
        <p>Updated: {c.updatedAt.toLocaleString()}</p>
      </div>
    </div>
  );
}
