import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const health = {
    status: "healthy" as "healthy" | "unhealthy",
    timestamp: new Date().toISOString(),
    checks: {
      database: { status: "unknown" as "healthy" | "unhealthy" | "unknown" },
    },
  };

  try {
    // Check database connectivity
    await db.execute(sql`SELECT 1`);
    health.checks.database.status = "healthy";
  } catch (error) {
    health.status = "unhealthy";
    health.checks.database.status = "unhealthy";
    console.error("Health check failed:", error);
  }

  const statusCode = health.status === "healthy" ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
