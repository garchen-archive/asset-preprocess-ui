import { db } from "@/lib/db/client";
import { archiveAssets, events, sessions } from "@/lib/db/schema";
import { desc, sql, ilike, or, eq, and, asc, gte, lte } from "drizzle-orm";
import { AssetsPageClient } from "@/components/assets-page-client";
import { Pagination } from "@/components/pagination";
import { AssetFilters } from "@/components/asset-filters";

export const dynamic = "force-dynamic";

export default async function AssetsPage({
  searchParams,
}: {
  searchParams: {
    search?: string;
    status?: string;
    type?: string;
    source?: string;
    isMediaFile?: string;
    safeToDelete?: string;
    exclude?: string;
    formats?: string;
    interpreterLangs?: string;
    hasOralTranslation?: string;
    transcriptLangs?: string;
    hasTimestampedTranscript?: string;
    transcriptsAvailable?: string;
    needsDetailedReview?: string;
    hasTranscriptRecord?: string;
    dateSearch?: string;
    dateFrom?: string;
    dateTo?: string;
    sortBy?: string;
    sortOrder?: string;
    page?: string;
  };
}) {
  const search = searchParams.search || "";
  const statusFilterRaw = searchParams.status || "";
  // Handle both string (single status) and array (multiple statuses) from URL params
  const selectedStatuses = Array.isArray(statusFilterRaw)
    ? statusFilterRaw
    : statusFilterRaw ? statusFilterRaw.split(',') : [];
  const statusFilter = selectedStatuses.length > 0 ? selectedStatuses.join(',') : "";
  const typeFilter = searchParams.type || "";
  const sourceFilter = searchParams.source || "";
  const isMediaFileFilter = searchParams.isMediaFile || "";
  const safeToDeleteFilter = searchParams.safeToDelete || "";
  // Default to showing only included assets (not excluded from archive) when page loads fresh
  const excludeFilter = searchParams.exclude === undefined ? "false" : searchParams.exclude;
  const formatsFilterRaw = searchParams.formats || "";
  // Handle both string (single format) and array (multiple formats) from URL params
  const selectedFormats = Array.isArray(formatsFilterRaw)
    ? formatsFilterRaw
    : formatsFilterRaw ? formatsFilterRaw.split(',') : [];
  // Normalize to string for URL params
  const formatsFilter = selectedFormats.length > 0 ? selectedFormats.join(',') : "";

  // New filters
  const interpreterLangsFilterRaw = searchParams.interpreterLangs || "";
  const selectedInterpreterLangs = Array.isArray(interpreterLangsFilterRaw)
    ? interpreterLangsFilterRaw
    : interpreterLangsFilterRaw ? interpreterLangsFilterRaw.split(',') : [];
  const interpreterLangsFilter = selectedInterpreterLangs.length > 0 ? selectedInterpreterLangs.join(',') : "";

  const hasOralTranslationFilter = searchParams.hasOralTranslation || "";

  const transcriptLangsFilterRaw = searchParams.transcriptLangs || "";
  const selectedTranscriptLangs = Array.isArray(transcriptLangsFilterRaw)
    ? transcriptLangsFilterRaw
    : transcriptLangsFilterRaw ? transcriptLangsFilterRaw.split(',') : [];
  const transcriptLangsFilter = selectedTranscriptLangs.length > 0 ? selectedTranscriptLangs.join(',') : "";

  const hasTimestampedTranscriptFilter = searchParams.hasTimestampedTranscript || "";
  const transcriptsAvailableFilter = searchParams.transcriptsAvailable || "";
  const needsDetailedReviewFilter = searchParams.needsDetailedReview || "";
  const hasTranscriptRecordFilter = searchParams.hasTranscriptRecord || "";
  const dateSearchFilter = searchParams.dateSearch || "";
  const dateFromFilter = searchParams.dateFrom || "";
  const dateToFilter = searchParams.dateTo || "";

  const sortBy = searchParams.sortBy || "createdAt";
  const sortOrder = searchParams.sortOrder || "desc";
  const page = parseInt(searchParams.page || "1");
  const perPage = 50;
  const offset = (page - 1) * perPage;

  // Build where conditions
  const conditions = [];

  if (search) {
    conditions.push(
      or(
        ilike(archiveAssets.name, `%${search}%`),
        ilike(archiveAssets.title, `%${search}%`),
        ilike(archiveAssets.descriptionSummary, `%${search}%`),
        ilike(archiveAssets.filepath, `%${search}%`)
      )
    );
  }

  // Multi-select processing status filter (uses new processingStatus field)
  if (selectedStatuses.length > 0) {
    const statusConditions = selectedStatuses.map(status => {
      return eq(archiveAssets.processingStatus, status);
    });
    conditions.push(or(...statusConditions));
  }

  if (typeFilter) {
    conditions.push(eq(archiveAssets.assetType, typeFilter));
  }

  if (sourceFilter) {
    conditions.push(eq(archiveAssets.metadataSource, sourceFilter));
  }

  if (isMediaFileFilter) {
    if (isMediaFileFilter === "true") {
      conditions.push(eq(archiveAssets.isMediaFile, true));
    } else if (isMediaFileFilter === "false") {
      conditions.push(eq(archiveAssets.isMediaFile, false));
    }
  }

  if (safeToDeleteFilter) {
    if (safeToDeleteFilter === "true") {
      conditions.push(eq(archiveAssets.safeToDeleteFromGdrive, true));
    } else if (safeToDeleteFilter === "false") {
      conditions.push(eq(archiveAssets.safeToDeleteFromGdrive, false));
    }
  }

  if (excludeFilter) {
    if (excludeFilter === "true") {
      conditions.push(eq(archiveAssets.exclude, true));
    } else if (excludeFilter === "false") {
      conditions.push(eq(archiveAssets.exclude, false));
    }
  }

  if (selectedFormats.length > 0) {
    conditions.push(
      or(...selectedFormats.map(format => eq(archiveAssets.fileFormat, format)))
    );
  }

  // Has oral translation filter
  if (hasOralTranslationFilter) {
    if (hasOralTranslationFilter === "true") {
      conditions.push(eq(archiveAssets.hasOralTranslation, true));
    } else if (hasOralTranslationFilter === "false") {
      conditions.push(
        or(eq(archiveAssets.hasOralTranslation, false), sql`${archiveAssets.hasOralTranslation} IS NULL`)
      );
    }
  }

  // Interpreter languages filter (JSONB array contains any of selected languages)
  if (selectedInterpreterLangs.length > 0) {
    const langConditions = selectedInterpreterLangs.map(lang =>
      sql`${archiveAssets.oralTranslationLanguages}::jsonb @> ${JSON.stringify([lang])}::jsonb`
    );
    conditions.push(or(...langConditions));
  }

  // Transcript languages filter (uses new transcriptLanguages field)
  if (selectedTranscriptLangs.length > 0) {
    const langConditions = selectedTranscriptLangs.map(lang =>
      sql`${archiveAssets.transcriptLanguages}::jsonb @> ${JSON.stringify([lang])}::jsonb`
    );
    conditions.push(or(...langConditions));
  }

  // Has timestamped transcript filter (uses new transcriptTimestamped field: Yes/No/Partial)
  if (hasTimestampedTranscriptFilter) {
    if (hasTimestampedTranscriptFilter === "Yes") {
      conditions.push(eq(archiveAssets.transcriptTimestamped, "Yes"));
    } else if (hasTimestampedTranscriptFilter === "Partial") {
      conditions.push(eq(archiveAssets.transcriptTimestamped, "Partial"));
    } else if (hasTimestampedTranscriptFilter === "No") {
      conditions.push(
        or(
          eq(archiveAssets.transcriptTimestamped, "No"),
          sql`${archiveAssets.transcriptTimestamped} IS NULL`
        )
      );
    }
  }

  // Needs detailed review filter (uses new needsDetailedReview field)
  if (needsDetailedReviewFilter) {
    if (needsDetailedReviewFilter === "true") {
      conditions.push(eq(archiveAssets.needsDetailedReview, true));
    } else if (needsDetailedReviewFilter === "false") {
      conditions.push(
        or(eq(archiveAssets.needsDetailedReview, false), sql`${archiveAssets.needsDetailedReview} IS NULL`)
      );
    }
  }

  // Transcripts available filter (uses new transcriptAvailable field)
  if (transcriptsAvailableFilter) {
    if (transcriptsAvailableFilter === "true") {
      conditions.push(eq(archiveAssets.transcriptAvailable, true));
    } else if (transcriptsAvailableFilter === "false") {
      conditions.push(
        or(eq(archiveAssets.transcriptAvailable, false), sql`${archiveAssets.transcriptAvailable} IS NULL`)
      );
    }
  }

  // Has transcript record filter (checks existence in transcript table)
  if (hasTranscriptRecordFilter) {
    if (hasTranscriptRecordFilter === "true") {
      conditions.push(
        sql`EXISTS (SELECT 1 FROM transcript t WHERE t.media_asset_id = ${archiveAssets.id} AND t.deleted_at IS NULL)`
      );
    } else if (hasTranscriptRecordFilter === "false") {
      conditions.push(
        sql`NOT EXISTS (SELECT 1 FROM transcript t WHERE t.media_asset_id = ${archiveAssets.id} AND t.deleted_at IS NULL)`
      );
    }
  }

  // Date search filter - LIKE search on createdDate or originalDate
  if (dateSearchFilter) {
    conditions.push(
      sql`(
        ${archiveAssets.createdDate}::text LIKE ${`%${dateSearchFilter}%`}
        OR ${archiveAssets.originalDate}::text LIKE ${`%${dateSearchFilter}%`}
      )`
    );
  }

  // Date range filter - filter by createdDate
  if (dateFromFilter) {
    conditions.push(gte(archiveAssets.createdDate, new Date(dateFromFilter)));
  }
  if (dateToFilter) {
    conditions.push(lte(archiveAssets.createdDate, new Date(dateToFilter)));
  }

  // Get total count for pagination
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(archiveAssets)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const totalPages = Math.ceil(count / perPage);

  // Determine sort column and direction
  const sortColumn = {
    name: archiveAssets.name,
    title: archiveAssets.title,
    duration: archiveAssets.duration,
    fileSizeMb: archiveAssets.fileSizeMb,
    createdDate: archiveAssets.createdDate,
    createdAt: archiveAssets.createdAt,
    updatedAt: archiveAssets.updatedAt,
    deletedAt: archiveAssets.deletedAt,
    lastHarvestedAt: archiveAssets.lastHarvestedAt,
  }[sortBy] || archiveAssets.createdAt;

  const orderByClause = sortOrder === "asc" ? sortColumn : desc(sortColumn);

  // Get assets with filters and pagination
  const assets = await db
    .select()
    .from(archiveAssets)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderByClause)
    .limit(perPage)
    .offset(offset);

  // Fetch all events for bulk assignment dropdown
  const eventsList = await db.select().from(events).orderBy(asc(events.eventName));

  // Fetch all sessions with their event info for bulk assignment dropdown
  const sessionsList = await db
    .select({
      session: sessions,
      event: events,
    })
    .from(sessions)
    .leftJoin(events, eq(sessions.eventId, events.id))
    .orderBy(asc(sessions.sessionName));

  // Get available file formats dynamically
  const availableFormats = await db
    .selectDistinct({ format: archiveAssets.fileFormat })
    .from(archiveAssets)
    .where(sql`${archiveAssets.fileFormat} IS NOT NULL`)
    .orderBy(archiveAssets.fileFormat)
    .then(results => results.map(r => r.format).filter(Boolean) as string[]);

  // Get available interpreter/transcript languages dynamically
  const availableLanguages = await db
    .select({ languages: archiveAssets.oralTranslationLanguages })
    .from(archiveAssets)
    .where(sql`${archiveAssets.oralTranslationLanguages} IS NOT NULL`)
    .then(results => {
      const allLangs = new Set<string>();
      results.forEach(r => {
        if (Array.isArray(r.languages)) {
          r.languages.forEach(lang => allLangs.add(lang));
        }
      });
      return Array.from(allLangs).sort();
    });

  // Get statistics for counters (only when no filters applied - excludeFilter must be empty/"All")
  const showStats = !search && !statusFilter && !typeFilter && !sourceFilter && !isMediaFileFilter && !safeToDeleteFilter && excludeFilter === "" && selectedFormats.length === 0 && !hasOralTranslationFilter && selectedInterpreterLangs.length === 0 && selectedTranscriptLangs.length === 0 && !hasTimestampedTranscriptFilter && !transcriptsAvailableFilter && !needsDetailedReviewFilter && !hasTranscriptRecordFilter && !dateSearchFilter && !dateFromFilter && !dateToFilter;
  let stats = null;

  if (showStats) {
    const [totalCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets);

    const [readyCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets)
      .where(eq(archiveAssets.catalogingStatus, "Ready"));

    const [inProgressCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets)
      .where(eq(archiveAssets.catalogingStatus, "In Progress"));

    const [notStartedCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets)
      .where(sql`${archiveAssets.catalogingStatus} IS NULL OR ${archiveAssets.catalogingStatus} = 'Not Started'`);

    const [videoCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets)
      .where(eq(archiveAssets.assetType, "video"));

    const [audioCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets)
      .where(eq(archiveAssets.assetType, "audio"));

    const [imageCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets)
      .where(eq(archiveAssets.assetType, "image"));

    const [documentCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets)
      .where(eq(archiveAssets.assetType, "document"));

    const [subtitleCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(archiveAssets)
      .where(eq(archiveAssets.assetType, "subtitle"));

    stats = {
      total: totalCount.count,
      ready: readyCount.count,
      inProgress: inProgressCount.count,
      notStarted: notStartedCount.count,
      video: videoCount.count,
      audio: audioCount.count,
      image: imageCount.count,
      document: documentCount.count,
      subtitle: subtitleCount.count,
    };
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Archive Assets</h1>
          <p className="text-muted-foreground">
            Manage your video, audio, and document archive
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="space-y-4">
          {/* Workflow Status */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-sm text-muted-foreground">Total Assets</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-green-600">{stats.ready}</div>
              <div className="text-sm text-muted-foreground">Ready</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-gray-600">{stats.notStarted}</div>
              <div className="text-sm text-muted-foreground">Not Started</div>
            </div>
          </div>

          {/* Asset Types */}
          <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-blue-600">{stats.video}</div>
              <div className="text-sm text-muted-foreground">Videos</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-purple-600">{stats.audio}</div>
              <div className="text-sm text-muted-foreground">Audio</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-pink-600">{stats.image}</div>
              <div className="text-sm text-muted-foreground">Images</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-orange-600">{stats.document}</div>
              <div className="text-sm text-muted-foreground">Documents</div>
            </div>

            <div className="rounded-lg border p-4">
              <div className="text-2xl font-bold text-teal-600">{stats.subtitle}</div>
              <div className="text-sm text-muted-foreground">Subtitles</div>
            </div>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <AssetFilters
        search={search}
        selectedStatuses={selectedStatuses}
        typeFilter={typeFilter}
        sourceFilter={sourceFilter}
        isMediaFileFilter={isMediaFileFilter}
        safeToDeleteFilter={safeToDeleteFilter}
        excludeFilter={excludeFilter}
        selectedFormats={selectedFormats}
        availableFormats={availableFormats}
        hasOralTranslationFilter={hasOralTranslationFilter}
        selectedInterpreterLangs={selectedInterpreterLangs}
        availableLanguages={availableLanguages}
        selectedTranscriptLangs={selectedTranscriptLangs}
        hasTimestampedTranscriptFilter={hasTimestampedTranscriptFilter}
        transcriptsAvailableFilter={transcriptsAvailableFilter}
        needsDetailedReviewFilter={needsDetailedReviewFilter}
        hasTranscriptRecordFilter={hasTranscriptRecordFilter}
        dateSearchFilter={dateSearchFilter}
        dateFromFilter={dateFromFilter}
        dateToFilter={dateToFilter}
      />

      {/* Results Info */}
      <div className="text-sm text-muted-foreground">
        Showing {offset + 1}-{Math.min(offset + perPage, count)} of {count} assets
        {search && ` matching "${search}"`}
      </div>

      {/* Assets Table with Bulk Actions */}
      <AssetsPageClient
        assets={assets}
        events={eventsList}
        sessions={sessionsList}
        offset={offset}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchParams={{
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
          ...(typeFilter && { type: typeFilter }),
          ...(sourceFilter && { source: sourceFilter }),
          ...(isMediaFileFilter && { isMediaFile: isMediaFileFilter }),
          ...(safeToDeleteFilter && { safeToDelete: safeToDeleteFilter }),
          exclude: excludeFilter,
          ...(formatsFilter && { formats: formatsFilter }),
          ...(hasOralTranslationFilter && { hasOralTranslation: hasOralTranslationFilter }),
          ...(interpreterLangsFilter && { interpreterLangs: interpreterLangsFilter }),
          ...(transcriptLangsFilter && { transcriptLangs: transcriptLangsFilter }),
          ...(hasTimestampedTranscriptFilter && { hasTimestampedTranscript: hasTimestampedTranscriptFilter }),
          ...(transcriptsAvailableFilter && { transcriptsAvailable: transcriptsAvailableFilter }),
          ...(needsDetailedReviewFilter && { needsDetailedReview: needsDetailedReviewFilter }),
          ...(hasTranscriptRecordFilter && { hasTranscriptRecord: hasTranscriptRecordFilter }),
          ...(dateSearchFilter && { dateSearch: dateSearchFilter }),
          ...(dateFromFilter && { dateFrom: dateFromFilter }),
          ...(dateToFilter && { dateTo: dateToFilter }),
        }}
      />

      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        basePath="/assets"
        searchParams={{
          ...(search && { search }),
          ...(statusFilter && { status: statusFilter }),
          ...(typeFilter && { type: typeFilter }),
          ...(sourceFilter && { source: sourceFilter }),
          ...(isMediaFileFilter && { isMediaFile: isMediaFileFilter }),
          ...(safeToDeleteFilter && { safeToDelete: safeToDeleteFilter }),
          exclude: excludeFilter,
          ...(formatsFilter && { formats: formatsFilter }),
          ...(hasOralTranslationFilter && { hasOralTranslation: hasOralTranslationFilter }),
          ...(interpreterLangsFilter && { interpreterLangs: interpreterLangsFilter }),
          ...(transcriptLangsFilter && { transcriptLangs: transcriptLangsFilter }),
          ...(hasTimestampedTranscriptFilter && { hasTimestampedTranscript: hasTimestampedTranscriptFilter }),
          ...(transcriptsAvailableFilter && { transcriptsAvailable: transcriptsAvailableFilter }),
          ...(needsDetailedReviewFilter && { needsDetailedReview: needsDetailedReviewFilter }),
          ...(hasTranscriptRecordFilter && { hasTranscriptRecord: hasTranscriptRecordFilter }),
          ...(dateSearchFilter && { dateSearch: dateSearchFilter }),
          ...(dateFromFilter && { dateFrom: dateFromFilter }),
          ...(dateToFilter && { dateTo: dateToFilter }),
        }}
      />
    </div>
  );
}
