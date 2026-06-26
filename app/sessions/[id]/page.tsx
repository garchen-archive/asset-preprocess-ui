import { db } from "@/lib/db/client";
import { sessions, archiveAssets, events, topics, categories, sessionTopics, sessionCategories, locations, eventSessionAsset, asset, transcripts, relatedAsset } from "@/lib/db/schema";
import { eq, asc, and, isNull, aliasedTable } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { deleteSession } from "@/lib/actions";
import { CanonicalAssetSelector } from "@/components/canonical-asset-selector";
import { TranscriptList } from "@/components/transcript-list";
import { SessionAssetsSection } from "@/components/session-assets-section";
import { RelatedAssetsSection } from "@/components/related-assets-section";
import { StatusBadge } from "@/components/status-badge";

export const dynamic = "force-dynamic";

export default async function SessionDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [sessionData] = await db
    .select({
      session: sessions,
      event: events,
    })
    .from(sessions)
    .leftJoin(events, eq(sessions.eventId, events.id))
    .where(and(eq(sessions.id, params.id), isNull(sessions.deletedAt)))
    .limit(1);

  if (!sessionData) {
    notFound();
  }

  const { session, event } = sessionData;

  // Get location if event has one
  const location = event?.locationId
    ? await db
        .select()
        .from(locations)
        .where(eq(locations.id, event.locationId))
        .limit(1)
        .then((results) => results[0] || null)
    : null;

  // Get assets in this session via event_session_asset junction table, sorted by title
  const sessionAssetLinks = await db
    .select({
      linkId: eventSessionAsset.id,
      variantType: eventSessionAsset.variantType,
      variantLabel: eventSessionAsset.variantLabel,
      asset: asset,
    })
    .from(eventSessionAsset)
    .innerJoin(asset, eq(eventSessionAsset.assetId, asset.id))
    .where(and(
      eq(eventSessionAsset.eventSessionId, params.id),
      isNull(eventSessionAsset.deletedAt)
    ))
    .orderBy(asc(asset.title), asc(asset.name));

  // Canonical is determined by the session's canonicalEventSessionAssetId FK
  const canonicalAssetId = session.canonicalEventSessionAssetId;

  // Get topics for this session
  const sessionTopicsList = await db
    .select({
      id: topics.id,
      name: topics.name,
    })
    .from(sessionTopics)
    .innerJoin(topics, eq(sessionTopics.topicId, topics.id))
    .where(eq(sessionTopics.eventSessionId, params.id));

  // Get categories for this session
  const sessionCategoriesList = await db
    .select({
      id: categories.id,
      name: categories.name,
    })
    .from(sessionCategories)
    .innerJoin(categories, eq(sessionCategories.categoryId, categories.id))
    .where(eq(sessionCategories.eventSessionId, params.id));

  // Get related assets for this session
  const relatedAssetAlias = aliasedTable(asset, "related_asset_file");
  const sessionRelatedAssets = await db
    .select({
      id: relatedAsset.id,
      assetId: relatedAsset.assetId,
      title: relatedAssetAlias.title,
      name: relatedAssetAlias.name,
      assetType: relatedAssetAlias.assetType,
      relatedType: relatedAsset.relatedType,
      label: relatedAsset.label,
      sequence: relatedAsset.sequence,
    })
    .from(relatedAsset)
    .innerJoin(relatedAssetAlias, eq(relatedAsset.assetId, relatedAssetAlias.id))
    .where(
      and(
        eq(relatedAsset.ownerType, "event_session"),
        eq(relatedAsset.ownerId, params.id),
        isNull(relatedAsset.deletedAt),
        isNull(relatedAssetAlias.deletedAt)
      )
    )
    .orderBy(asc(relatedAsset.sequence));

  // Get transcripts for this session with media and canonical asset info via JOINs
  const mediaAsset = aliasedTable(asset, "media_asset");
  const canonicalAsset = aliasedTable(asset, "canonical_asset");

  const sessionTranscriptsRaw = await db
    .select({
      id: transcripts.id,
      language: transcripts.language,
      kind: transcripts.kind,
      spokenSource: transcripts.spokenSource,
      publicationStatus: transcripts.publicationStatus,
      stage: transcripts.stage,
      mediaAssetId: transcripts.mediaAssetId,
      canonicalAssetId: transcripts.canonicalAssetId,
      subtitleTrackId: transcripts.subtitleTrackId,
      syncedAt: transcripts.syncedAt,
      // Media asset info
      mediaName: mediaAsset.name,
      mediaTitle: mediaAsset.title,
      // Canonical asset info
      canonicalName: canonicalAsset.name,
      canonicalTitle: canonicalAsset.title,
      canonicalFormat: canonicalAsset.fileFormat,
    })
    .from(transcripts)
    .leftJoin(mediaAsset, eq(transcripts.mediaAssetId, mediaAsset.id))
    .leftJoin(canonicalAsset, eq(transcripts.canonicalAssetId, canonicalAsset.id))
    .where(
      and(
        eq(transcripts.eventSessionId, params.id),
        isNull(transcripts.deletedAt)
      )
    );

  // Flatten and compute display names
  const transcriptsWithAssetNames = sessionTranscriptsRaw.map((tr) => {
    const mediaAssetName = tr.mediaTitle || tr.mediaName || null;
    const canonicalBaseName = tr.canonicalTitle || tr.canonicalName || null;
    const canonicalAssetName = canonicalBaseName && tr.canonicalFormat
      ? `${canonicalBaseName} (${tr.canonicalFormat})`
      : canonicalBaseName;

    return {
      id: tr.id,
      language: tr.language,
      kind: tr.kind,
      spokenSource: tr.spokenSource,
      publicationStatus: tr.publicationStatus,
      stage: tr.stage,
      mediaAssetId: tr.mediaAssetId,
      canonicalAssetId: tr.canonicalAssetId,
      subtitleTrackId: tr.subtitleTrackId,
      syncedAt: tr.syncedAt,
      mediaAssetName,
      canonicalAssetName,
    };
  });

  // Get the actual asset ID from the canonical link (eventSessionAsset -> asset)
  const canonicalLink = sessionAssetLinks.find(link => link.linkId === canonicalAssetId);
  const canonicalMediaAssetId = canonicalLink?.asset.id;

  // Get transcripts on canonical asset (with full info for display)
  const canonicalAssetTranscriptsRaw = canonicalMediaAssetId
    ? await db
        .select({
          id: transcripts.id,
          language: transcripts.language,
          kind: transcripts.kind,
          spokenSource: transcripts.spokenSource,
          publicationStatus: transcripts.publicationStatus,
          stage: transcripts.stage,
          mediaAssetId: transcripts.mediaAssetId,
          canonicalAssetId: transcripts.canonicalAssetId,
          eventSessionId: transcripts.eventSessionId,
          subtitleTrackId: transcripts.subtitleTrackId,
          syncedAt: transcripts.syncedAt,
          // Canonical asset info (the VTT file)
          canonicalName: canonicalAsset.name,
          canonicalTitle: canonicalAsset.title,
          canonicalFormat: canonicalAsset.fileFormat,
        })
        .from(transcripts)
        .leftJoin(canonicalAsset, eq(transcripts.canonicalAssetId, canonicalAsset.id))
        .where(
          and(
            eq(transcripts.mediaAssetId, canonicalMediaAssetId),
            isNull(transcripts.deletedAt)
          )
        )
    : [];

  // Get IDs of transcripts already linked to this session (to avoid duplicates)
  const sessionLinkedIds = new Set(transcriptsWithAssetNames.map(t => t.id));

  // Filter canonical asset transcripts to those NOT already in session list
  const canonicalOnlyTranscripts = canonicalAssetTranscriptsRaw
    .filter(tr => !sessionLinkedIds.has(tr.id))
    .map(tr => {
      const canonicalBaseName = tr.canonicalTitle || tr.canonicalName || null;
      const canonicalAssetName = canonicalBaseName && tr.canonicalFormat
        ? `${canonicalBaseName} (${tr.canonicalFormat})`
        : canonicalBaseName;

      // Get the media asset name from the canonical link
      const mediaAssetName = canonicalLink?.asset.title || canonicalLink?.asset.name || null;

      return {
        id: tr.id,
        language: tr.language,
        kind: tr.kind,
        spokenSource: tr.spokenSource,
        publicationStatus: tr.publicationStatus,
        stage: tr.stage,
        mediaAssetId: tr.mediaAssetId,
        canonicalAssetId: tr.canonicalAssetId,
        subtitleTrackId: tr.subtitleTrackId,
        syncedAt: tr.syncedAt,
        mediaAssetName,
        canonicalAssetName,
        viaCanonicalAsset: true, // Flag to indicate this comes from canonical asset
      };
    });

  // Combine session-linked and canonical asset transcripts
  const allTranscripts = [
    ...transcriptsWithAssetNames.map(tr => ({ ...tr, viaCanonicalAsset: false })),
    ...canonicalOnlyTranscripts,
  ];

  // For Quick Add: transcripts on canonical asset not linked to this session
  const linkableTranscripts = canonicalAssetTranscriptsRaw.filter(
    tr => tr.eventSessionId !== params.id
  );

  // Build breadcrumbs
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Events", href: "/events" },
  ];

  if (event) {
    breadcrumbItems.push({
      label: event.eventName,
      href: `/events/${event.id}`,
    });
  }

  breadcrumbItems.push({ label: session.sessionName });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Breadcrumbs items={breadcrumbItems} />
          <h1 className="text-3xl font-bold">{session.sessionName}</h1>
        </div>
        <Button asChild>
          <Link href={`/sessions/${params.id}/edit`}>Edit</Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Session Details */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Session Details</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Event</dt>
                <dd className="text-sm mt-1">
                  {event ? (
                    <Link href={`/events/${event.id}`} className="text-blue-600 hover:underline">
                      {event.eventName}
                    </Link>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Session Date</dt>
                <dd className="text-sm mt-1">{session.sessionDate || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Day Number</dt>
                <dd className="text-sm mt-1">
                  {session.dayNumber ? (
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-700">
                      Day {session.dayNumber}
                    </span>
                  ) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Day Label</dt>
                <dd className="text-sm mt-1">{session.dayLabel || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Session Time</dt>
                <dd className="text-sm mt-1">{session.sessionTime || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Start Time</dt>
                <dd className="text-sm mt-1">{session.sessionStartTime || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">End Time</dt>
                <dd className="text-sm mt-1">{session.sessionEndTime || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Duration (Estimated)</dt>
                <dd className="text-sm mt-1">{session.durationEstimated || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Category & Topic */}
          <div className="rounded-lg border p-6 bg-blue-50/50">
            <h2 className="text-xl font-semibold mb-4">Categories & Topics</h2>
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-2">Categories</dt>
                <dd className="flex flex-wrap gap-2">
                  {sessionCategoriesList.length > 0 ? (
                    sessionCategoriesList.map((cat) => (
                      <Badge key={cat.id} variant="secondary">
                        {cat.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground mb-2">Topics</dt>
                <dd className="flex flex-wrap gap-2">
                  {sessionTopicsList.length > 0 ? (
                    sessionTopicsList.map((topic) => (
                      <Badge key={topic.id} variant="secondary">
                        {topic.name}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </dd>
              </div>
            </div>
            {session.sessionDescription && (
              <div className="mt-4">
                <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                <dd className="text-sm mt-1">{session.sessionDescription}</dd>
              </div>
            )}
          </div>

          {/* Location */}
          {event && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Location</h2>
              {location ? (
                <div>
                  <div className="p-4 rounded-md bg-green-50/50 border border-green-200">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium mb-1">
                          <Link href={`/locations/${location.id}`} className="text-blue-600 hover:underline">
                            {location.name}
                          </Link>
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{location.code}</p>
                        {location.isOnline && (
                          <p className="text-xs text-muted-foreground mt-1">Online</p>
                        )}
                      </div>
                      {location.locationType && (
                        <Badge variant="secondary" className="text-xs">
                          {location.locationType}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground italic">
                      Location from event: <Link href={`/events/${event.id}`} className="hover:underline text-blue-600">{event.eventName}</Link>
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted-foreground">
                    No location assigned to parent event.
                  </p>
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-xs text-muted-foreground italic">
                      Parent event: <Link href={`/events/${event.id}`} className="hover:underline text-blue-600">{event.eventName}</Link>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Assets in this Session */}
          <SessionAssetsSection
            sessionId={params.id}
            sessionName={session.sessionName}
            assets={sessionAssetLinks.map((link) => ({
              id: link.asset.id,
              linkId: link.linkId,
              title: link.asset.title,
              name: link.asset.name,
              assetType: link.asset.assetType,
              duration: link.asset.duration,
              catalogingStatus: link.asset.catalogingStatus,
              variantType: link.variantType,
              variantLabel: link.variantLabel,
              isCanonical: link.linkId === canonicalAssetId,
            }))}
          />

          {/* Transcripts for this Session */}
          <TranscriptList
            scope="session"
            sessionId={params.id}
            transcripts={allTranscripts.map(tr => ({
              ...tr,
              syncedAt: tr.syncedAt?.toISOString() || null,
            }))}
            sessionAssets={sessionAssetLinks.map((link) => ({
              linkId: link.linkId,
              assetId: link.asset.id,
              assetName: link.asset.title || link.asset.name,
              variantType: link.variantType,
              variantLabel: link.variantLabel,
            }))}
            canonicalAssetLinkId={canonicalAssetId}
            linkableTranscripts={linkableTranscripts.map(tr => ({
              id: tr.id,
              language: tr.language,
              kind: tr.kind,
              spokenSource: tr.spokenSource,
              stage: tr.stage,
              isSynced: !!tr.subtitleTrackId,
            }))}
          />

          {/* Related Assets */}
          <RelatedAssetsSection
            ownerType="event_session"
            ownerId={params.id}
            ownerName={session.sessionName}
            assets={sessionRelatedAssets}
          />
        </div>

        <div className="space-y-6">
          {/* Administrative */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Administrative</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Cataloging Status</dt>
                <dd className="text-sm mt-1">
                  <StatusBadge
                    entityType="session"
                    entityId={params.id}
                    statusField="cataloging_status"
                    currentValue={session.catalogingStatus}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Publication Status</dt>
                <dd className="text-sm mt-1">
                  <StatusBadge
                    entityType="session"
                    entityId={params.id}
                    statusField="publication_status"
                    currentValue={session.publicationStatus}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Has Assets</dt>
                <dd className="text-sm mt-1">{session.hasAssets ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Asset Count</dt>
                <dd className="text-sm mt-1">{session.assetCount}</dd>
              </div>
            </dl>
          </div>

          {/* Canonical Asset Selector */}
          {sessionAssetLinks.length > 0 && (
            <div className="rounded-lg border p-6">
              <CanonicalAssetSelector
                sessionId={params.id}
                assets={sessionAssetLinks.map((link) => ({
                  linkId: link.linkId,
                  assetId: link.asset.id,
                  assetName: link.asset.title || link.asset.name,
                  variantType: link.variantType,
                  variantLabel: link.variantLabel,
                }))}
                currentCanonicalId={canonicalAssetId}
              />
            </div>
          )}

          {/* Notes */}
          {session.notes && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <p className="text-sm">{session.notes}</p>
            </div>
          )}

          {/* Additional Metadata */}
          {session.additionalMetadata && Object.keys(session.additionalMetadata).length > 0 && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Additional Metadata</h2>
              <div className="bg-muted/50 rounded p-3">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(session.additionalMetadata, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          <div className="rounded-lg border border-destructive/50 p-6">
            <h2 className="text-xl font-semibold mb-2 text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Deleting this session cannot be undone.
            </p>
            <form action={deleteSession}>
              <input type="hidden" name="id" value={params.id} />
              <input type="hidden" name="redirectTo" value="/sessions" />
              <Button type="submit" variant="destructive" size="sm">
                Delete Session
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
