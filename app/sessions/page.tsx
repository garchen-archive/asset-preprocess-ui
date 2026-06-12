import { db } from "@/lib/db/client";
import { sessions, events } from "@/lib/db/schema";
import { desc, eq, sql, and, ilike, or, isNull } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pagination } from "@/components/pagination";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    status?: string;
    event?: string;
    page?: string;
  };
}) {
  const search = searchParams.search || "";
  const statusFilter = searchParams.status || "";
  const eventFilter = searchParams.event || "";
  const page = parseInt(searchParams.page || "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  // Build where conditions - always filter out soft-deleted sessions
  const conditions = [isNull(sessions.deletedAt)];

  if (search) {
    conditions.push(
      ilike(sessions.sessionName, `%${search}%`)
    );
  }

  if (statusFilter) {
    if (statusFilter === "null") {
      conditions.push(sql`${sessions.catalogingStatus} IS NULL`);
    } else {
      conditions.push(eq(sessions.catalogingStatus, statusFilter));
    }
  }

  if (eventFilter) {
    conditions.push(eq(sessions.eventId, eventFilter));
  }

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessions)
    .where(and(...conditions));

  const totalPages = Math.ceil(count / perPage);

  const sessionsList = await db
    .select({
      session: sessions,
      event: events,
    })
    .from(sessions)
    .leftJoin(events, eq(sessions.eventId, events.id))
    .where(and(...conditions))
    .orderBy(desc(sessions.createdAt))
    .limit(perPage)
    .offset(offset);

  // Get events for filter dropdown
  const eventsList = await db
    .select({ id: events.id, eventName: events.eventName })
    .from(events)
    .orderBy(events.eventName);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sessions</h1>
          <p className="text-muted-foreground">
            Manage individual teaching sessions
          </p>
        </div>
        <Button asChild>
          <Link href="/sessions/new">Create Session</Link>
        </Button>
      </div>

      {/* Search and Filters */}
      <form className="rounded-lg border p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Input
              name="search"
              placeholder="Search by name or ID..."
              defaultValue={search}
            />
          </div>

          <div>
            <select
              name="status"
              defaultValue={statusFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Statuses</option>
              <option value="null">Not Started</option>
              <option value="In Progress">In Progress</option>
              <option value="Ready">Ready</option>
              <option value="Needs Review">Needs Review</option>
            </select>
          </div>

          <div>
            <select
              name="event"
              defaultValue={eventFilter}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="">All Events</option>
              {eventsList.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.eventName}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button type="submit">Apply Filters</Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/sessions">Clear</Link>
          </Button>
        </div>
      </form>

      {/* Results Info */}
      <div className="text-sm text-muted-foreground">
        Showing {offset + 1}-{Math.min(offset + perPage, count)} of {count} sessions
        {search && ` matching "${search}"`}
      </div>

      <div className="rounded-md border">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left text-sm font-medium w-16">#</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Session Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Event</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Day</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Duration</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sessionsList.map(({ session, event }, index) => (
              <tr key={session.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                <td className="px-4 py-3 text-sm">{session.sessionName}</td>
                <td className="px-4 py-3 text-sm">{event?.eventName || "—"}</td>
                <td className="px-4 py-3 text-sm">{session.sessionDate || "—"}</td>
                <td className="px-4 py-3 text-sm">
                  {session.dayNumber ? (
                    <span className="inline-flex items-center gap-1">
                      <span className="font-medium">Day {session.dayNumber}</span>
                      {session.dayLabel && <span className="text-muted-foreground text-xs">({session.dayLabel})</span>}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-4 py-3 text-sm">{session.durationEstimated || "—"}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      session.catalogingStatus === "Ready"
                        ? "bg-green-100 text-green-700"
                        : session.catalogingStatus === "In Progress"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {session.catalogingStatus || "Not Started"}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/sessions/${session.id}`}
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

      {sessionsList.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No sessions found. Create your first session to get started.
        </div>
      )}

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/sessions"
        searchParams={{
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
          ...(eventFilter && { event: eventFilter }),
        }}
      />
    </div>
  );
}
