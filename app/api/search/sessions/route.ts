import { db } from "@/lib/db/client";
import { eventSession, event } from "@/lib/db/schema";
import { or, ilike, and, isNull, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const searchPattern = `%${query}%`;

  const whereClause = and(
    isNull(eventSession.deletedAt),
    or(
      ilike(eventSession.sessionName, searchPattern),
      ilike(eventSession.title, searchPattern),
      ilike(eventSession.topic, searchPattern)
    )
  );

  const results = await db
    .select({
      id: eventSession.id,
      sessionName: eventSession.sessionName,
      title: eventSession.title,
      sessionDate: eventSession.sessionDate,
      eventId: eventSession.eventId,
      eventName: event.eventName,
    })
    .from(eventSession)
    .leftJoin(event, eq(event.id, eventSession.eventId))
    .where(whereClause)
    .orderBy(eventSession.sessionName)
    .limit(limit);

  return NextResponse.json(results);
}
