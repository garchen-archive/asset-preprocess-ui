import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { bulkRefreshTranscriptContent } from "@/lib/actions";

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const eventSessionId = body.eventSessionId as string | undefined;
    const limit = body.limit as number | undefined;

    console.log("[refresh-content] Starting bulk refresh", { eventSessionId, limit });

    const result = await bulkRefreshTranscriptContent({
      eventSessionId,
      limit: limit ?? 100,
    });

    console.log("[refresh-content] Result:", result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[refresh-content] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
