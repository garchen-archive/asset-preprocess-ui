import { db } from "@/lib/db/client";
import { transcripts, archiveAssets, sessions, events } from "@/lib/db/schema";
import { eq, or, inArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TranscriptForm } from "@/components/transcript-form";

export const dynamic = "force-dynamic";

export default async function EditTranscriptPage({
  params,
}: {
  params: { id: string };
}) {
  // Fetch the transcript
  const [transcript] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.id, params.id))
    .limit(1);

  if (!transcript) {
    notFound();
  }

  // Fetch media asset info
  const [mediaAsset] = await db
    .select({
      id: archiveAssets.id,
      name: archiveAssets.name,
      title: archiveAssets.title,
      assetType: archiveAssets.assetType,
    })
    .from(archiveAssets)
    .where(eq(archiveAssets.id, transcript.mediaAssetId))
    .limit(1);

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

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div>
        <Link
          href={`/transcripts/${params.id}`}
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          &larr; Back to Transcript
        </Link>
        <h1 className="text-3xl font-bold">Edit Transcript</h1>
        <p className="text-muted-foreground">
          Version {transcript.version} &bull; Last updated{" "}
          {new Date(transcript.updatedAt).toLocaleString()}
        </p>
      </div>

      {/* Form */}
      <TranscriptForm
        mode="edit"
        transcript={transcript}
        mediaAssets={[]}
        transcriptAssets={transcriptAssets}
        eventSessions={eventSessions}
        linkedMediaAsset={mediaAsset}
        cancelHref={`/transcripts/${params.id}`}
      />
    </div>
  );
}
