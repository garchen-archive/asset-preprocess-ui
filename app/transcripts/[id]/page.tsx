import { db } from "@/lib/db/client";
import { transcripts, transcriptRevisions, archiveAssets } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteTranscript } from "@/lib/actions";

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

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700",
  reviewed: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  published: "bg-purple-100 text-purple-700",
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
          <form action={deleteTranscript.bind(null, params.id)}>
            <Button
              type="submit"
              variant="destructive"
              onClick={(e) => {
                if (!confirm("Are you sure you want to delete this transcript?")) {
                  e.preventDefault();
                }
              }}
            >
              Delete
            </Button>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Status & Version */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Status</h2>
              <span
                className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${
                  STATUS_COLORS[transcript.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {transcript.status}
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
                            STATUS_COLORS[rev.statusSnapshot] || "bg-gray-100 text-gray-700"
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
          {/* Media Asset */}
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Media Asset</h2>
            {mediaAsset ? (
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
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Duration</dt>
                  <dd className="mt-0.5 text-sm">{mediaAsset.duration || "—"}</dd>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Asset not found</p>
            )}
          </div>

          {/* Canonical Asset (Transcript File) */}
          <div className="rounded-lg border p-6">
            <h2 className="text-lg font-semibold mb-4">Transcript File</h2>
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
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No transcript file linked</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
