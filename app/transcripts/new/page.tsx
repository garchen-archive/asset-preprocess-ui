import { db } from "@/lib/db/client";
import { archiveAssets, sessions, events, eventSessionAsset, asset } from "@/lib/db/schema";
import { or, eq, inArray, isNull } from "drizzle-orm";
import Link from "next/link";
import { TranscriptForm } from "@/components/transcript-form";

export const dynamic = "force-dynamic";

export default async function NewTranscriptPage({
  searchParams,
}: {
  searchParams: { mediaAssetId?: string; canonicalAssetId?: string };
}) {
  // Fetch media assets (video/audio)
  const mediaAssets = await db
    .select({
      id: archiveAssets.id,
      name: archiveAssets.name,
      title: archiveAssets.title,
      assetType: archiveAssets.assetType,
    })
    .from(archiveAssets)
    .where(
      or(
        eq(archiveAssets.assetType, "video"),
        eq(archiveAssets.assetType, "audio")
      )
    )
    .orderBy(archiveAssets.name)
    .limit(1000);

  // Fetch transcript file assets (subtitle/document)
  const transcriptAssets = await db
    .select({
      id: archiveAssets.id,
      name: archiveAssets.name,
      title: archiveAssets.title,
      assetType: archiveAssets.assetType,
      fileFormat: archiveAssets.fileFormat,
    })
    .from(archiveAssets)
    .where(
      or(
        eq(archiveAssets.assetType, "subtitle"),
        eq(archiveAssets.assetType, "document"),
        inArray(archiveAssets.fileFormat, ["srt", "vtt", "txt", "doc", "docx", "pdf"])
      )
    )
    .orderBy(archiveAssets.name)
    .limit(1000);

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
        mediaAssets={mediaAssets}
        transcriptAssets={transcriptAssets}
        eventSessions={eventSessions}
        eventSessionAssets={sessionAssets}
        defaultMediaAssetId={searchParams.mediaAssetId}
        defaultCanonicalAssetId={searchParams.canonicalAssetId}
        cancelHref="/transcripts"
      />
    </div>
  );
}
