import { db } from "@/lib/db/client";
import { transcripts, transcriptRevisions, archiveAssets, sessions, events, eventSessionAsset, asset } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DeleteTranscriptButton } from "@/components/delete-transcript-button";
import { BackblazeLink } from "@/components/backblaze-link";

export const dynamic = "force-dynamic";

const LANGUAGE_LABELS: Record<string, string> = {
  bo: "Tibetan",
  en: "English",
  zh: "Chinese",
  es: "Spanish",
  de: "German",
  vi: "Vietnamese",
  fr: "French",
  pt: "Portuguese",
  multi: "Multi-language",
};

const PUBLICATION_STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  in_review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  published: "bg-purple-100 text-purple-700",
  needs_work: "bg-orange-100 text-orange-700",
  archived: "bg-slate-100 text-slate-700",
};

export default async function TranscriptDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Fetch transcript with media asset
  const [result] = await db
    .select({
      transcript: transcripts,
      mediaAsset: archiveAssets,
    })
    .from(transcripts)
    .leftJoin(archiveAssets, eq(transcripts.mediaAssetId, archiveAssets.id))
    .where(eq(transcripts.id, params.id))
    .limit(1);

  if (!result) {
    notFound();
  }

  const { transcript, mediaAsset } = result;

  // Fetch canonical asset if exists
  let canonicalAsset = null;
  if (transcript.canonicalAssetId) {
    const [asset] = await db
      .select()
      .from(archiveAssets)
      .where(eq(archiveAssets.id, transcript.canonicalAssetId))
      .limit(1);
    canonicalAsset = asset;
  }

  // Fetch linked event session if exists
  let eventSession = null;
  if (transcript.eventSessionId) {
    const [session] = await db
      .select({
        id: sessions.id,
        sessionName: sessions.sessionName,
        eventId: sessions.eventId,
        eventName: events.eventName,
      })
      .from(sessions)
      .leftJoin(events, eq(sessions.eventId, events.id))
      .where(eq(sessions.id, transcript.eventSessionId))
      .limit(1);
    eventSession = session;
  }

  // Fetch linked event session asset if exists
  let sessionAsset = null;
  if (transcript.eventSessionAssetId) {
    const [esa] = await db
      .select({
        id: eventSessionAsset.id,
        variantType: eventSessionAsset.variantType,
        variantLabel: eventSessionAsset.variantLabel,
        assetId: eventSessionAsset.assetId,
        assetName: asset.name,
        assetTitle: asset.title,
      })
      .from(eventSessionAsset)
      .leftJoin(asset, eq(eventSessionAsset.assetId, asset.id))
      .where(eq(eventSessionAsset.id, transcript.eventSessionAssetId))
      .limit(1);
    sessionAsset = esa;
  }

  // Fetch revision history
  const revisions = await db
    .select()
    .from(transcriptRevisions)
    .where(eq(transcriptRevisions.transcriptId, params.id))
    .orderBy(desc(transcriptRevisions.versionNumber));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/transcripts"
            className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
          >
            &larr; Back to Transcripts
          </Link>
          <h1 className="text-3xl font-bold">Transcript Details</h1>
          <p className="text-muted-foreground">
            {mediaAsset?.title || mediaAsset?.name || "Unknown Asset"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/transcripts/${params.id}/edit`}>Edit</Link>
          </Button>
          <DeleteTranscriptButton id={params.id} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Version */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Publication Status</h2>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  PUBLICATION_STATUS_COLORS[transcript.publicationStatus] || "bg-gray-100 text-gray-700"
                }`}
              >
                {transcript.publicationStatus}
              </span>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Version</dt>
                <dd className="mt-1">v{transcript.version}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Created</dt>
                <dd className="mt-1">
                  {new Date(transcript.createdAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Last Updated</dt>
                <dd className="mt-1">
                  {new Date(transcript.updatedAt).toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Last Edited By</dt>
                <dd className="mt-1">{transcript.editedBy || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Language & Type */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Language & Type</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Language</dt>
                <dd className="mt-1">
                  {LANGUAGE_LABELS[transcript.language] || transcript.language}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Kind</dt>
                <dd className="mt-1 capitalize">{transcript.kind}</dd>
              </div>
              {transcript.kind === "transcript" && (
                <>
                  <div>
                    <dt className="font-medium text-muted-foreground">Spoken Source</dt>
                    <dd className="mt-1 capitalize">{transcript.spokenSource || "—"}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Spoken Language</dt>
                    <dd className="mt-1">
                      {transcript.spokenLanguage
                        ? LANGUAGE_LABELS[transcript.spokenLanguage] || transcript.spokenLanguage
                        : "—"}
                    </dd>
                  </div>
                </>
              )}
              {transcript.kind === "translation" && (
                <div>
                  <dt className="font-medium text-muted-foreground">Translation Of</dt>
                  <dd className="mt-1 capitalize">{transcript.translationOf || "—"}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Technical Details */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Technical Details</h2>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="font-medium text-muted-foreground">Timecode Status</dt>
                <dd className="mt-1 capitalize">{transcript.timecodeStatus || "none"}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Source</dt>
                <dd className="mt-1 capitalize">{transcript.source || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-muted-foreground">Created By</dt>
                <dd className="mt-1">{transcript.createdBy || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Notes */}
          {transcript.notes && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <p className="text-sm whitespace-pre-wrap">{transcript.notes}</p>
            </div>
          )}

          {/* Revision History */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Revision History</h2>
            {revisions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No revisions</p>
            ) : (
              <div className="space-y-4">
                {revisions.map((rev) => (
                  <div
                    key={rev.id}
                    className="flex items-start gap-4 pb-4 border-b last:border-0 last:pb-0"
                  >
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-muted flex items-center justify-center font-medium">
                      v{rev.versionNumber}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {rev.editedBy || "Unknown"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(rev.editedAt).toLocaleString()}
                        </span>
                      </div>
                      {rev.changeNote && (
                        <p className="text-sm text-muted-foreground mt-1">
                          {rev.changeNote}
                        </p>
                      )}
                      {rev.statusSnapshot && (
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mt-2 ${
                            PUBLICATION_STATUS_COLORS[rev.statusSnapshot] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {rev.statusSnapshot}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar - Linked Assets */}
        <div className="space-y-6">
          {/* Canonical Asset (Transcript File) */}
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Canonical Asset</h2>
            {canonicalAsset ? (
              <div className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Name</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/assets/${canonicalAsset.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {canonicalAsset.title || canonicalAsset.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Type</dt>
                  <dd className="mt-0.5 text-sm capitalize">
                    {canonicalAsset.assetType || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Format</dt>
                  <dd className="mt-0.5 text-sm uppercase">
                    {canonicalAsset.fileFormat || "—"}
                  </dd>
                </div>
                {canonicalAsset.filepath && (
                  <div className="pt-2">
                    <BackblazeLink fileKey={canonicalAsset.filepath} label="View SRT File" />
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No transcript file linked</p>
            )}
          </div>

          {/* Event Session */}
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Event Session</h2>
            {eventSession ? (
              <div className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Session</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/sessions/${eventSession.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {eventSession.sessionName}
                    </Link>
                  </dd>
                </div>
                {eventSession.eventName && (
                  <div>
                    <dt className="text-xs font-medium text-muted-foreground">Event</dt>
                    <dd className="mt-0.5">
                      <Link
                        href={`/events/${eventSession.eventId}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {eventSession.eventName}
                      </Link>
                    </dd>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No event session linked</p>
            )}
          </div>

          {/* Event Session Asset */}
          {sessionAsset && (
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Event Session Asset</h2>
              <div className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Variant</dt>
                  <dd className="mt-0.5 text-sm capitalize">
                    {sessionAsset.variantLabel || sessionAsset.variantType}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Asset</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/assets/${sessionAsset.assetId}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {sessionAsset.assetTitle || sessionAsset.assetName}
                    </Link>
                  </dd>
                </div>
              </div>
            </div>
          )}

          {/* Media Asset (variant-specific timing) */}
          {mediaAsset && (
            <div className="rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Media Asset</h2>
              <p className="text-xs text-muted-foreground mb-3">
                Transcript timing aligned to this specific file.
              </p>
              <div className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Name</dt>
                  <dd className="mt-0.5">
                    <Link
                      href={`/assets/${mediaAsset.id}`}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      {mediaAsset.title || mediaAsset.name}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Type</dt>
                  <dd className="mt-0.5 text-sm capitalize">{mediaAsset.assetType || "—"}</dd>
                </div>
                {(mediaAsset.metadataSource === 'backblaze' || mediaAsset.metadataSource === 'pipeline') && mediaAsset.filepath && (
                  <div className="pt-2">
                    <BackblazeLink fileKey={mediaAsset.filepath} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
