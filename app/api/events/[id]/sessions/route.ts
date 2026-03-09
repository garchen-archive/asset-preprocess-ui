import { db } from "@/lib/db/client";
import { sessions } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const eventSessions = await db
      .select({
        id: sessions.id,
        sessionName: sessions.sessionName,
        sessionDate: sessions.sessionDate,
      })
      .from(sessions)
      .where(eq(sessions.eventId, params.id))
      .orderBy(asc(sessions.sessionDate), asc(sessions.sessionStartTime), asc(sessions.sessionName));

    return NextResponse.json(eventSessions);
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
