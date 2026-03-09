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
  const statusFilter = searchParams.status || "";
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
  if (statusFilter) {
    conditions.push(eq(transcripts.status, statusFilter));
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
      case "status":
        return transcripts.status;
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

  // Fetch transcripts with media asset info
  const transcriptsList = await db
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
    .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined)
    .orderBy(orderBy)
    .limit(ITEMS_PER_PAGE)
    .offset(offset);

  // Get total count
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(transcripts)
    .where(conditions.length > 0 ? sql`${sql.join(conditions, sql` AND `)}` : undefined);

  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

  // Get distinct values for filters
  const [languagesResult, kindsResult, statusesResult, timecodesResult, sourcesResult] = await Promise.all([
    db.selectDistinct({ value: transcripts.language }).from(transcripts).where(isNull(transcripts.deletedAt)),
    db.selectDistinct({ value: transcripts.kind }).from(transcripts).where(isNull(transcripts.deletedAt)),
    db.selectDistinct({ value: transcripts.status }).from(transcripts).where(isNull(transcripts.deletedAt)),
    db.selectDistinct({ value: transcripts.timecodeStatus }).from(transcripts).where(isNull(transcripts.deletedAt)),
    db.selectDistinct({ value: transcripts.source }).from(transcripts).where(isNull(transcripts.deletedAt)),
  ]);

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
        transcripts={transcriptsList}
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
