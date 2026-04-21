import { db } from "@/lib/db/client";
import { archiveAssets, sessions, events, eventSessionAsset, asset } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import Link from "next/link";
import { TranscriptForm } from "@/components/transcript-form";

export const dynamic = "force-dynamic";

export default async function NewTranscriptPage({
  searchParams,
}: {
  searchParams: { mediaAssetId?: string; canonicalAssetId?: string };
}) {
  // Fetch initial assets if IDs are provided (for pre-selection)
  let initialMediaAsset = null;
  let initialCanonicalAsset = null;

  if (searchParams.mediaAssetId) {
    const [asset] = await db
      .select({
        id: archiveAssets.id,
        name: archiveAssets.name,
        title: archiveAssets.title,
        assetType: archiveAssets.assetType,
      })
      .from(archiveAssets)
      .where(eq(archiveAssets.id, searchParams.mediaAssetId))
      .limit(1);
    initialMediaAsset = asset || null;
  }

  if (searchParams.canonicalAssetId) {
    const [asset] = await db
      .select({
        id: archiveAssets.id,
        name: archiveAssets.name,
        title: archiveAssets.title,
        assetType: archiveAssets.assetType,
        fileFormat: archiveAssets.fileFormat,
      })
      .from(archiveAssets)
      .where(eq(archiveAssets.id, searchParams.canonicalAssetId))
      .limit(1);
    initialCanonicalAsset = asset || null;
  }

  // Fetch event sessions for linking
  const eventSessions = await db
    .select({
      id: sessions.id,
      sessionName: sessions.sessionName,
      eventName: events.eventName,
    })
    .from(sessions)
    .leftJoin(events, eq(sessions.eventId, events.id))
    .where(isNull(sessions.deletedAt))
    .orderBy(sessions.sessionName)
    .limit(1000);

  // Fetch event session assets (media variants)
  const sessionAssets = await db
    .select({
      id: eventSessionAsset.id,
      eventSessionId: eventSessionAsset.eventSessionId,
      assetId: eventSessionAsset.assetId,
      assetName: asset.name,
      assetTitle: asset.title,
      variantType: eventSessionAsset.variantType,
      variantLabel: eventSessionAsset.variantLabel,
    })
    .from(eventSessionAsset)
    .leftJoin(asset, eq(eventSessionAsset.assetId, asset.id))
    .limit(2000);

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href="/transcripts"
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          &larr; Back to Transcripts
        </Link>
        <h1 className="text-3xl font-bold">New Transcript</h1>
        <p className="text-muted-foreground">
          Create a new transcript record linking a media asset to its transcript file.
        </p>
      </div>

      {/* Form */}
      <TranscriptForm
        mode="create"
        eventSessions={eventSessions}
        eventSessionAssets={sessionAssets}
        initialMediaAsset={initialMediaAsset}
        initialCanonicalAsset={initialCanonicalAsset}
        defaultMediaAssetId={searchParams.mediaAssetId}
        defaultCanonicalAssetId={searchParams.canonicalAssetId}
        cancelHref="/transcripts"
      />
    </div>
  );
}
