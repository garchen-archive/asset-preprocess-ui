import { db } from "@/lib/db/client";
import { transcripts, archiveAssets } from "@/lib/db/schema";
import { eq, isNull, desc, asc, sql, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { TranscriptsPageClient } from "@/components/transcripts-page-client";

export const dynamic = "force-dynamic";

const ITEMS_PER_PAGE = 50;

export default async function TranscriptsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const search = searchParams.search || "";
  const languageFilter = searchParams.language || "";
  const kindFilter = searchParams.kind || "";
  const publicationStatusFilter = searchParams.publicationStatus || "";
  const timecodeFilter = searchParams.timecode || "";
  const sourceFilter = searchParams.source || "";
  const sortBy = searchParams.sortBy || "updatedAt";
  const sortOrder = searchParams.sortOrder || "desc";
  const page = parseInt(searchParams.page || "1", 10);
  const offset = (page - 1) * ITEMS_PER_PAGE;

  // Build conditions
  const conditions = [isNull(transcripts.deletedAt)];

  if (languageFilter) {
    conditions.push(eq(transcripts.language, languageFilter));
  }
  if (kindFilter) {
    conditions.push(eq(transcripts.kind, kindFilter));
  }
  if (publicationStatusFilter) {
    conditions.push(eq(transcripts.publicationStatus, publicationStatusFilter));
  }
  if (timecodeFilter) {
    conditions.push(eq(transcripts.timecodeStatus, timecodeFilter));
  }
  if (sourceFilter) {
    conditions.push(eq(transcripts.source, sourceFilter));
  }

  // Search by media asset name
  const searchCondition = search
    ? sql`EXISTS (SELECT 1 FROM asset aa WHERE aa.id = ${transcripts.mediaAssetId} AND (aa.name ILIKE ${`%${search}%`} OR aa.title ILIKE ${`%${search}%`}))`
    : undefined;

  if (searchCondition) {
    conditions.push(searchCondition);
  }

  // Sorting
  const getSortColumn = () => {
    switch (sortBy) {
      case "language":
        return transcripts.language;
      case "kind":
        return transcripts.kind;
      case "publicationStatus":
        return transcripts.publicationStatus;
      case "version":
        return transcripts.version;
      case "createdAt":
        return transcripts.createdAt;
      case "updatedAt":
      default:
        return transcripts.updatedAt;
    }
  };

  const orderBy = sortOrder === "asc" ? asc(getSortColumn()) : desc(getSortColumn());
  const whereClause = conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined;

  // Run all independent queries in parallel for better performance
  const [
    transcriptsList,
    countResult,
    languagesResult,
    kindsResult,
    statusesResult,
    timecodesResult,
    sourcesResult,
  ] = await Promise.all([
    // Main query: transcripts with media asset info
    db
      .select({
        transcript: transcripts,
        mediaAsset: {
          id: archiveAssets.id,
          name: archiveAssets.name,
          title: archiveAssets.title,
          assetType: archiveAssets.assetType,
          duration: archiveAssets.duration,
        },
      })
      .from(transcripts)
      .leftJoin(archiveAssets, eq(transcripts.mediaAssetId, archiveAssets.id))
      .where(whereClause)
      .orderBy(orderBy)
      .limit(ITEMS_PER_PAGE)
      .offset(offset),
    // Count query
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(transcripts)
      .where(whereClause),
    // Filter options (these run in parallel too)
    db.selectDistinct({ value: transcripts.language }).from(transcripts).where(isNull(transcripts.deletedAt)),
    db.selectDistinct({ value: transcripts.kind }).from(transcripts).where(isNull(transcripts.deletedAt)),
    db.selectDistinct({ value: transcripts.publicationStatus }).from(transcripts).where(isNull(transcripts.deletedAt)),
    db.selectDistinct({ value: transcripts.timecodeStatus }).from(transcripts).where(isNull(transcripts.deletedAt)),
    db.selectDistinct({ value: transcripts.source }).from(transcripts).where(isNull(transcripts.deletedAt)),
  ]);

  const count = countResult[0].count;
  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

  // Fetch canonical asset storage info in a second query (efficient IN query, only if needed)
  const canonicalAssetIds = transcriptsList
    .map(t => t.transcript.canonicalAssetId)
    .filter((id): id is string => id !== null);

  const canonicalAssetsMap = new Map<string, { metadataSource: string | null; fileFormat: string | null }>();
  if (canonicalAssetIds.length > 0) {
    const canonicalAssets = await db
      .select({
        id: archiveAssets.id,
        metadataSource: archiveAssets.metadataSource,
        fileFormat: archiveAssets.fileFormat,
      })
      .from(archiveAssets)
      .where(sql`${archiveAssets.id} IN ${canonicalAssetIds}`);

    for (const ca of canonicalAssets) {
      canonicalAssetsMap.set(ca.id, { metadataSource: ca.metadataSource, fileFormat: ca.fileFormat });
    }
  }

  // Merge canonical asset info into the result
  const transcriptsWithCanonical = transcriptsList.map(t => ({
    ...t,
    canonicalAsset: t.transcript.canonicalAssetId
      ? canonicalAssetsMap.get(t.transcript.canonicalAssetId) || null
      : null,
  }));

  const languages = languagesResult.map((r) => r.value).filter((v): v is string => Boolean(v)).sort();
  const kinds = kindsResult.map((r) => r.value).filter((v): v is string => Boolean(v)).sort();
  const statuses = statusesResult.map((r) => r.value).filter((v): v is string => Boolean(v)).sort();
  const timecodes = timecodesResult.map((r) => r.value).filter((v): v is string => Boolean(v)).sort();
  const sources = sourcesResult.map((r) => r.value).filter((v): v is string => Boolean(v)).sort();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transcripts</h1>
          <p className="text-muted-foreground">
            {count} transcript{count !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button asChild>
          <Link href="/transcripts/new">New Transcript</Link>
        </Button>
      </div>

      {/* Client component for filters, table, and bulk actions */}
      <TranscriptsPageClient
        transcripts={transcriptsWithCanonical}
        totalCount={count}
        currentPage={page}
        totalPages={totalPages}
        languages={languages}
        kinds={kinds}
        statuses={statuses}
        timecodes={timecodes}
        sources={sources}
        searchParams={searchParams}
      />
    </div>
  );
}
