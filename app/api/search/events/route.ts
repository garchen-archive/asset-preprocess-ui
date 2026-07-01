import { db } from "@/lib/db/client";
import { event } from "@/lib/db/schema";
import { or, ilike, and, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const excludeId = searchParams.get("exclude"); // Exclude self-reference
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const searchPattern = `%${query}%`;

  let whereClause = and(
    isNull(event.deletedAt),
    or(
      ilike(event.eventName, searchPattern),
      ilike(event.eventDescription, searchPattern)
    )
  );

  const results = await db
    .select({
      id: event.id,
      eventName: event.eventName,
      eventDateStart: event.eventDateStart,
      eventDateEnd: event.eventDateEnd,
      eventType: event.eventType,
    })
    .from(event)
    .where(whereClause)
    .orderBy(event.eventName)
    .limit(limit);

  // Filter out excluded ID in JS (simpler than dynamic SQL)
  const filtered = excludeId
    ? results.filter(e => e.id !== excludeId)
    : results;

  return NextResponse.json(filtered);
}
