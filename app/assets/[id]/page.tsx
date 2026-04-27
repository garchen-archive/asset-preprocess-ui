import { db } from "@/lib/db/client";
import { archiveAssets, sessions, events, transcripts } from "@/lib/db/schema";
import { eq, isNull, and } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";
import { notFound } from "next/navigation";
import { DeleteAssetButton } from "@/components/delete-asset-button";
import { BackblazeLink } from "@/components/backblaze-link";
import { MuxVideoPlayer } from "@/components/mux-video-player";

export const dynamic = "force-dynamic";

export default async function AssetDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [assetData] = await db
    .select({
      asset: archiveAssets,
      session: sessions,
      sessionEvent: events, // Event via session
    })
    .from(archiveAssets)
    .leftJoin(sessions, eq(archiveAssets.eventSessionId, sessions.id))
    .leftJoin(events, eq(sessions.eventId, events.id))
    .where(eq(archiveAssets.id, params.id))
    .limit(1);

  if (!assetData) {
    notFound();
  }

  const { asset: data, session, sessionEvent } = assetData;

  // Fetch direct event if eventId is set
  let directEvent = null;
  if (data.eventId) {
    const [eventResult] = await db
      .select()
      .from(events)
      .where(eq(events.id, data.eventId))
      .limit(1);
    directEvent = eventResult || null;
  }

  // Use direct event if available, otherwise use event from session
  const event = directEvent || sessionEvent;

  // Fetch transcripts linked to this asset as media asset
  const linkedTranscripts = await db
    .select()
    .from(transcripts)
    .where(
      and(
        isNull(transcripts.deletedAt),
        eq(transcripts.mediaAssetId, params.id)
      )
    );

  // Fetch transcripts where this asset is the canonical (transcript file)
  const asCanonicalTranscripts = await db
    .select()
    .from(transcripts)
    .where(
      and(
        isNull(transcripts.deletedAt),
        eq(transcripts.canonicalAssetId, params.id)
      )
    );

  // Build breadcrumbs
  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Assets", href: "/assets" },
  ];

  breadcrumbItems.push({ label: data.title || data.name || "Untitled Asset" });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <Breadcrumbs items={breadcrumbItems} />
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 flex-shrink-0">
              {(data.youtubeLink || (data.gdriveUrl && (data.gdriveUrl.includes('youtube.com') || data.gdriveUrl.includes('youtu.be')))) && (
                <a
                  href={data.youtubeLink || data.gdriveUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Watch on YouTube"
                  className="text-red-600 hover:opacity-75 transition-opacity"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                </a>
              )}
              {data.gdriveUrl && data.gdriveUrl.includes('drive.google.com') && (
                <a
                  href={data.gdriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="Open in Google Drive"
                  className="hover:opacity-75 transition-opacity"
                >
                  <svg className="w-6 h-6" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                    <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                    <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                    <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                    <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                    <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                    <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                  </svg>
                </a>
              )}
              {(data.metadataSource === 'backblaze' || data.metadataSource === 'pipeline') && data.filepath && (
                <BackblazeLink fileKey={data.filepath} variant="icon" />
              )}
              {data.mediaProvider === "mux" && data.mediaProviderAssetId && (
                <span
                  title="Available on Mux"
                  className="text-pink-600"
                >
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold">{data.title || data.name || "Untitled Asset"}</h1>
          </div>
          <p className="text-muted-foreground">{data.name}</p>
        </div>
        <Button asChild>
          <Link href={`/assets/${params.id}/edit`}>Edit</Link>
        </Button>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Main details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Video Platform Section - Show if Mux is configured */}
          {data.mediaProvider === "mux" && data.mediaProviderAssetId && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Video Platform</h2>

              {/* Video Player */}
              {(() => {
                const mediaProviderData = data.additionalMetadata?.media_provider as {
                  playback_id?: string;
                  duration?: number;
                  aspect_ratio?: string;
                  status?: string;
                } | undefined;

                const playbackId = mediaProviderData?.playback_id;

                if (playbackId) {
                  return (
                    <div className="mb-4">
                      <MuxVideoPlayer
                        playbackId={playbackId}
                        title={data.title || data.name || undefined}
                      />
                    </div>
                  );
                }
                return null;
              })()}

              {/* Platform Info */}
              <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Provider</dt>
                  <dd className="text-sm mt-1">
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-pink-100 text-pink-700 capitalize">
                      {data.mediaProvider}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Asset ID</dt>
                  <dd className="text-sm mt-1 font-mono text-xs">{data.mediaProviderAssetId}</dd>
                </div>

                {(() => {
                  const mediaProviderData = data.additionalMetadata?.media_provider as {
                    playback_id?: string;
                    duration?: number;
                    aspect_ratio?: string;
                    status?: string;
                  } | undefined;

                  return (
                    <>
                      {mediaProviderData?.playback_id && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Playback ID</dt>
                          <dd className="text-sm mt-1 font-mono text-xs">{mediaProviderData.playback_id}</dd>
                        </div>
                      )}
                      {mediaProviderData?.status && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                          <dd className="text-sm mt-1">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                              mediaProviderData.status === "ready"
                                ? "bg-green-100 text-green-700"
                                : mediaProviderData.status === "preparing"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-gray-100 text-gray-700"
                            }`}>
                              {mediaProviderData.status}
                            </span>
                          </dd>
                        </div>
                      )}
                      {mediaProviderData?.duration && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Duration</dt>
                          <dd className="text-sm mt-1">
                            {Math.floor(mediaProviderData.duration / 60)}:{String(Math.floor(mediaProviderData.duration % 60)).padStart(2, '0')}
                          </dd>
                        </div>
                      )}
                      {mediaProviderData?.aspect_ratio && (
                        <div>
                          <dt className="text-sm font-medium text-muted-foreground">Aspect Ratio</dt>
                          <dd className="text-sm mt-1">{mediaProviderData.aspect_ratio}</dd>
                        </div>
                      )}
                    </>
                  );
                })()}
              </dl>
            </div>
          )}

          {/* Identity Section */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Identity</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Filename</dt>
                <dd className="text-sm mt-1">{data.name || "—"}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-muted-foreground">File Path</dt>
                <dd className="text-sm mt-1 break-all">{data.filepath || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Asset Type</dt>
                <dd className="text-sm mt-1">
                  <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                    {data.assetType || "unknown"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Media File</dt>
                <dd className="text-sm mt-1">{data.isMediaFile ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">File Size</dt>
                <dd className="text-sm mt-1">
                  {data.fileSizeMb ? `${data.fileSizeMb.toFixed(2)} MB` : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Duration</dt>
                <dd className="text-sm mt-1">{data.duration || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Content Section */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Content</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Title</dt>
                <dd className="text-sm mt-1">{data.title || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Category</dt>
                <dd className="text-sm mt-1">{data.category || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Description</dt>
                <dd className="text-sm mt-1">{data.descriptionSummary || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Additional Topics</dt>
                <dd className="text-sm mt-1">{data.additionalTopics || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Translation Section */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Translation</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Has Oral Translation</dt>
                <dd className="text-sm mt-1">{data.hasOralTranslation ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Languages</dt>
                <dd className="text-sm mt-1">
                  {data.oralTranslationLanguages?.join(", ") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Interpreter</dt>
                <dd className="text-sm mt-1">{data.interpreterName || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Has Subtitles</dt>
                <dd className="text-sm mt-1">{data.hasSubtitleFiles ? "Yes" : "No"}</dd>
              </div>
            </dl>
          </div>

          {/* Transcript Section */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Transcript</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Available</dt>
                <dd className="text-sm mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      data.transcriptAvailable
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {data.transcriptAvailable ? "Yes" : "No"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Timestamped</dt>
                <dd className="text-sm mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      data.transcriptTimestamped === "Yes"
                        ? "bg-green-100 text-green-700"
                        : data.transcriptTimestamped === "Partial"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {data.transcriptTimestamped || "No"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Languages</dt>
                <dd className="text-sm mt-1">
                  {data.transcriptLanguages && data.transcriptLanguages.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {data.transcriptLanguages.map((lang: string) => (
                        <span
                          key={lang}
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-100 text-blue-700"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Location</dt>
                <dd className="text-sm mt-1">
                  {data.transcriptLocation ? (
                    data.transcriptLocation.startsWith("http") ? (
                      <a
                        href={data.transcriptLocation}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline break-all"
                      >
                        {data.transcriptLocation}
                      </a>
                    ) : (
                      <span className="break-all">{data.transcriptLocation}</span>
                    )
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
            </dl>
          </div>

          {/* Linked Transcript Records */}
          <div className="rounded-lg border p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Transcript Records</h2>
              <div className="flex gap-2">
                {(data.assetType === "video" || data.assetType === "audio") && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/transcripts/new?mediaAssetId=${params.id}`}>
                      Add Transcript
                    </Link>
                  </Button>
                )}
                {(data.assetType === "subtitle" || data.assetType === "document" ||
                  ["srt", "vtt", "txt", "doc", "docx", "pdf"].includes(data.fileFormat || "")) && (
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/transcripts/new?canonicalAssetId=${params.id}`}>
                      Use as Transcript File
                    </Link>
                  </Button>
                )}
              </div>
            </div>
            {linkedTranscripts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No transcript records linked to this asset.
              </p>
            ) : (
              <div className="space-y-3">
                {linkedTranscripts.map((tr) => (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <Link
                          href={`/transcripts/${tr.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {tr.language.toUpperCase()} {tr.kind}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              tr.publicationStatus === "published"
                                ? "bg-purple-100 text-purple-700"
                                : tr.publicationStatus === "approved"
                                ? "bg-green-100 text-green-700"
                                : tr.publicationStatus === "in_review"
                                ? "bg-blue-100 text-blue-700"
                                : tr.publicationStatus === "needs_work"
                                ? "bg-orange-100 text-orange-700"
                                : tr.publicationStatus === "archived"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {tr.publicationStatus}
                          </span>
                          {tr.timecodeStatus && tr.timecodeStatus !== "none" && (
                            <span className="text-xs text-muted-foreground">
                              Timecode: {tr.timecodeStatus}
                            </span>
                          )}
                          {tr.source && (
                            <span className="text-xs text-muted-foreground capitalize">
                              ({tr.source})
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      v{tr.version}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transcripts using this asset as canonical file */}
          {asCanonicalTranscripts.length > 0 && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Used As Transcript File</h2>
              <p className="text-sm text-muted-foreground mb-4">
                This asset is used as the transcript file for the following transcript records.
              </p>
              <div className="space-y-3">
                {asCanonicalTranscripts.map((tr) => (
                  <div
                    key={tr.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border"
                  >
                    <div className="flex items-center gap-3">
                      <div>
                        <Link
                          href={`/transcripts/${tr.id}`}
                          className="text-sm font-medium text-blue-600 hover:underline"
                        >
                          {tr.language.toUpperCase()} {tr.kind}
                        </Link>
                        <div className="flex items-center gap-2 mt-1">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              tr.publicationStatus === "published"
                                ? "bg-purple-100 text-purple-700"
                                : tr.publicationStatus === "approved"
                                ? "bg-green-100 text-green-700"
                                : tr.publicationStatus === "in_review"
                                ? "bg-blue-100 text-blue-700"
                                : tr.publicationStatus === "needs_work"
                                ? "bg-orange-100 text-orange-700"
                                : tr.publicationStatus === "archived"
                                ? "bg-slate-100 text-slate-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {tr.publicationStatus}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            (canonical file)
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      v{tr.version}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Processing & Publication Section */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Processing & Publication</h2>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Processing Status</dt>
                <dd className="text-sm mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      data.processingStatus === "transcoded"
                        ? "bg-green-100 text-green-700"
                        : data.processingStatus === "ingesting"
                        ? "bg-blue-100 text-blue-700"
                        : data.processingStatus === "queued"
                        ? "bg-purple-100 text-purple-700"
                        : data.processingStatus === "failed"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {data.processingStatus || "imported"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Publication Status</dt>
                <dd className="text-sm mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      data.publicationStatus === "published"
                        ? "bg-green-100 text-green-700"
                        : data.publicationStatus === "archived"
                        ? "bg-slate-100 text-slate-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {data.publicationStatus || "draft"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Needs Detailed Review</dt>
                <dd className="text-sm mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      data.needsDetailedReview
                        ? "bg-orange-100 text-orange-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {data.needsDetailedReview ? "Yes" : "No"}
                  </span>
                </dd>
              </div>
            </dl>
          </div>

          {/* Technical Metadata */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Technical Metadata</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Video Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Video</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Resolution</span>
                    <span className="text-sm font-medium">{data.resolution || "—"}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Codec</span>
                    <span className="text-sm font-medium">{data.videoCodec || "—"}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Codec Desc</span>
                    <span className="text-xs text-muted-foreground/80 text-right max-w-[180px]">{data.videoCodecDescription || "—"}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Frame Rate</span>
                    <span className="text-sm font-medium">{data.frameRate ? `${data.frameRate} fps` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* Audio Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">Audio</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Codec</span>
                    <span className="text-sm font-medium">{data.audioCodec || "—"}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Codec Desc</span>
                    <span className="text-xs text-muted-foreground/80 text-right max-w-[180px]">{data.audioCodecDescription || "—"}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Channels</span>
                    <span className="text-sm font-medium">{data.audioChannels || "—"}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Sample Rate</span>
                    <span className="text-sm font-medium">{data.sampleRate ? `${data.sampleRate} Hz` : "—"}</span>
                  </div>
                </div>
              </div>

              {/* File Section */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b pb-1">File</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Kind</span>
                    <span className="text-sm font-medium">{data.fileKind || "—"}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Format</span>
                    <span className="text-sm font-medium uppercase">{data.fileFormat || "—"}</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-muted-foreground">Bitrate</span>
                    <span className="text-sm font-medium">{data.bitrate || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Sidebar */}
        <div className="space-y-6">
          {/* Administrative */}
          <div className="rounded-lg border p-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-xl font-semibold">Administrative</h2>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/assets/${params.id}/edit#assignment`}>
                  Change Assignment
                </Link>
              </Button>
            </div>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Assignment Level</dt>
                <dd className="text-sm mt-1">
                  {data.eventId && !data.eventSessionId ? (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                      Event (Direct)
                    </span>
                  ) : data.eventSessionId && !data.eventId ? (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700">
                      Session (Detailed)
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700">
                      Uncataloged
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Event</dt>
                <dd className="text-sm mt-1">
                  {event ? (
                    <Link href={`/events/${event.id}`} className="text-blue-600 hover:underline">
                      {event.eventName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Session</dt>
                <dd className="text-sm mt-1">
                  {session ? (
                    <Link href={`/sessions/${session.id}`} className="text-blue-600 hover:underline">
                      {session.sessionName}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Not assigned</span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                <dd className="text-sm mt-1">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      data.catalogingStatus === "Ready"
                        ? "bg-green-100 text-green-700"
                        : data.catalogingStatus === "In Progress"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {data.catalogingStatus || "Not Started"}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Cataloged By</dt>
                <dd className="text-sm mt-1">{data.catalogedBy || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Cataloging Date</dt>
                <dd className="text-sm mt-1">
                  {data.catalogingDate
                    ? new Date(data.catalogingDate).toLocaleDateString()
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Backed Up Locally</dt>
                <dd className="text-sm mt-1">{data.backedUpLocally ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Safe to Delete from GDrive</dt>
                <dd className="text-sm mt-1">
                  {(data.assetType === 'youtube' || data.youtubeLink || (data.gdriveUrl && (data.gdriveUrl.includes('youtube.com') || data.gdriveUrl.includes('youtu.be')))) ? (
                    <span className="text-muted-foreground/50">N/A (YouTube video)</span>
                  ) : data.safeToDeleteFromGdrive ? (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700">
                      Yes - Safe to Delete
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-100 text-green-700">
                      No - Keep
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Exclude from Archive</dt>
                <dd className="text-sm mt-1">{data.exclude ? "Yes" : "No"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Contributor</dt>
                <dd className="text-sm mt-1">{data.contributorOrg || "—"}</dd>
              </div>
            </dl>
          </div>

          {/* Links */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">Links</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Google Drive</dt>
                <dd className="text-sm mt-1">
                  {data.gdriveUrl && data.gdriveUrl.includes('drive.google.com') ? (
                    <a
                      href={data.gdriveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline inline-flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 87.3 78" xmlns="http://www.w3.org/2000/svg">
                        <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
                        <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0 -1.2 4.5h27.5z" fill="#00ac47"/>
                        <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
                        <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
                        <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
                        <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
                      </svg>
                      Open in Drive
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-muted-foreground">YouTube</dt>
                <dd className="text-sm mt-1">
                  {data.youtubeLink || (data.gdriveUrl && (data.gdriveUrl.includes('youtube.com') || data.gdriveUrl.includes('youtu.be'))) ? (
                    <a
                      href={data.youtubeLink || data.gdriveUrl!}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:underline inline-flex items-center gap-1"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      Watch on YouTube
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              {(data.metadataSource === 'backblaze' || data.metadataSource === 'pipeline') && data.filepath && (
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Cloud Storage</dt>
                  <dd className="text-sm mt-1">
                    <BackblazeLink fileKey={data.filepath} />
                  </dd>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Source</dt>
                <dd className="text-sm mt-1 capitalize">{data.metadataSource}</dd>
              </div>
            </dl>
          </div>

          {/* System Metadata */}
          <div className="rounded-lg border p-6">
            <h2 className="text-xl font-semibold mb-4">System Metadata</h2>
            <dl className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Asset Created Date</dt>
                <dd className="text-sm mt-1">
                  {data.createdDate
                    ? new Date(data.createdDate).toLocaleString()
                    : "—"}
                </dd>
              </div>
            </dl>

            {/* Harvest Timestamps */}
            <div className="mt-6 pt-4 border-t">
              <h3 className="text-sm font-medium text-muted-foreground/70 mb-3">Harvest Info</h3>
              <dl className="space-y-3">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Last Harvested At</dt>
                  <dd className="text-xs mt-1">
                    {data.lastHarvestedAt
                      ? new Date(data.lastHarvestedAt).toLocaleString()
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Harvest Imported At</dt>
                  <dd className="text-xs mt-1">
                    {data.sourceUpdatedAt
                      ? new Date(data.sourceUpdatedAt).toLocaleString()
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            {/* System Timestamps - dimmed */}
            <div className="mt-4 pt-3 border-t border-dashed">
              <h3 className="text-xs font-medium text-muted-foreground/50 mb-2">System</h3>
              <dl className="space-y-2 opacity-40">
                <div className="flex gap-4 text-xs">
                  <div>
                    <dt className="font-medium text-muted-foreground">Created</dt>
                    <dd className="mt-0.5">
                      {data.createdAt
                        ? new Date(data.createdAt).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-medium text-muted-foreground">Updated</dt>
                    <dd className="mt-0.5">
                      {data.updatedAt
                        ? new Date(data.updatedAt).toLocaleString()
                        : "—"}
                    </dd>
                  </div>
                </div>
              </dl>
            </div>
          </div>

          {/* Quality */}
          {(data.audioQuality || data.videoQuality || data.audioQualityIssues || data.videoQualityIssues || data.needsEditing) && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Quality</h2>
              <dl className="space-y-4">
                {(data.audioQuality || data.videoQuality) && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Audio Quality</dt>
                      <dd className="text-sm mt-1 capitalize">{data.audioQuality || "Not rated"}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Video Quality</dt>
                      <dd className="text-sm mt-1 capitalize">{data.videoQuality || "Not rated"}</dd>
                    </div>
                  </div>
                )}
                {data.needsEditing && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Needs Editing</dt>
                    <dd className="text-sm mt-1">Yes</dd>
                  </div>
                )}
                {data.audioQualityIssues && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Audio Issues</dt>
                    <dd className="text-sm mt-1">{data.audioQualityIssues}</dd>
                  </div>
                )}
                {data.videoQualityIssues && (
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">Video Issues</dt>
                    <dd className="text-sm mt-1">{data.videoQualityIssues}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}

          {/* Notes */}
          {data.notes && (
            <div className="rounded-lg border p-6">
              <h2 className="text-xl font-semibold mb-4">Notes</h2>
              <p className="text-sm">{data.notes}</p>
            </div>
          )}

          {/* Additional Metadata */}
          <div className="rounded-lg border p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-xl font-semibold">Additional Metadata</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  JSON field for storing flexible data like original filename, alternative titles, custom tags, etc.
                </p>
              </div>
            </div>
            {data.additionalMetadata && Object.keys(data.additionalMetadata).length > 0 ? (
              <div className="bg-muted/50 rounded p-3 mt-3">
                <pre className="text-xs overflow-x-auto font-mono">
                  {JSON.stringify(data.additionalMetadata, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="bg-muted/30 rounded p-4 mt-3 border border-dashed">
                <p className="text-sm text-muted-foreground text-center">
                  No additional metadata stored
                </p>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  Use the Edit page to add custom metadata fields
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="border-t pt-6">
        <div className="rounded-lg border border-destructive/50 p-6">
          <h2 className="text-xl font-semibold mb-2 text-destructive">Danger Zone</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Deleting this asset will permanently remove it from the database. This action cannot be undone.
          </p>
          <DeleteAssetButton id={params.id} />
        </div>
      </div>
    </div>
  );
}
