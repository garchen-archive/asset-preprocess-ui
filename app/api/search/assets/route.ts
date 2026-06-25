import { db } from "@/lib/db/client";
import { archiveAssets } from "@/lib/db/schema";
import { or, ilike, eq, and, isNull, sql } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q") || "";
  const type = searchParams.get("type") || "media"; // "media" or "transcript"
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  if (!query || query.length < 2) {
    return NextResponse.json([]);
  }

  const searchPattern = `%${query}%`;

  let whereClause;

  if (type === "all") {
    // All assets
    whereClause = and(
      isNull(archiveAssets.deletedAt),
      or(
        ilike(archiveAssets.name, searchPattern),
        ilike(archiveAssets.title, searchPattern),
        ilike(archiveAssets.descriptionSummary, searchPattern)
      )
    );
  } else if (type === "non-media") {
    // Non-media assets: documents, images, etc. (for related assets)
    // Includes everything except video/audio
    whereClause = and(
      isNull(archiveAssets.deletedAt),
      sql`(${archiveAssets.assetType} IS NULL OR ${archiveAssets.assetType} NOT IN ('video', 'audio'))`,
      or(
        ilike(archiveAssets.name, searchPattern),
        ilike(archiveAssets.title, searchPattern),
        ilike(archiveAssets.descriptionSummary, searchPattern)
      )
    );
  } else if (type === "media") {
    // Media assets: video, audio, or isMediaFile=true
    whereClause = and(
      isNull(archiveAssets.deletedAt),
      or(
        eq(archiveAssets.assetType, "video"),
        eq(archiveAssets.assetType, "audio"),
        eq(archiveAssets.isMediaFile, true)
      ),
      or(
        ilike(archiveAssets.name, searchPattern),
        ilike(archiveAssets.title, searchPattern),
        ilike(archiveAssets.descriptionSummary, searchPattern)
      )
    );
  } else {
    // Transcript file assets: subtitle, document, or specific formats
    whereClause = and(
      isNull(archiveAssets.deletedAt),
      or(
        eq(archiveAssets.assetType, "subtitle"),
        eq(archiveAssets.assetType, "document"),
        ilike(archiveAssets.fileFormat, "srt"),
        ilike(archiveAssets.fileFormat, "vtt"),
        ilike(archiveAssets.fileFormat, "txt"),
        ilike(archiveAssets.fileFormat, "doc"),
        ilike(archiveAssets.fileFormat, "docx"),
        ilike(archiveAssets.fileFormat, "pdf")
      ),
      or(
        ilike(archiveAssets.name, searchPattern),
        ilike(archiveAssets.title, searchPattern),
        ilike(archiveAssets.descriptionSummary, searchPattern)
      )
    );
  }

  const results = await db
    .select({
      id: archiveAssets.id,
      name: archiveAssets.name,
      title: archiveAssets.title,
      assetType: archiveAssets.assetType,
      fileFormat: archiveAssets.fileFormat,
    })
    .from(archiveAssets)
    .where(whereClause)
    .orderBy(archiveAssets.name)
    .limit(limit);

  return NextResponse.json(results);
}
