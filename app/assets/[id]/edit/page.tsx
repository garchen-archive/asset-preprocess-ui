import { db } from "@/lib/db/client";
import { archiveAssets, sessions, events } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EventOrSessionSelect } from "@/components/event-or-session-select";
import { updateAsset } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function AssetEditPage({
  params,
}: {
  params: { id: string };
}) {
  const asset = await db
    .select()
    .from(archiveAssets)
    .where(eq(archiveAssets.id, params.id))
    .limit(1);

  if (!asset || asset.length === 0) {
    notFound();
  }

  const data = asset[0];

  // Fetch all sessions with their event info for the dropdown
  const sessionsList = await db
    .select({
      session: sessions,
      event: events,
    })
    .from(sessions)
    .leftJoin(events, eq(sessions.eventId, events.id))
    .orderBy(asc(sessions.sessionName));

  // Fetch all events for the event dropdown
  const eventsList = await db.select().from(events).orderBy(asc(events.eventName));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href={`/assets/${params.id}`}
            className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
          >
            ← Back to Asset
          </Link>
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
            </div>
            <h1 className="text-3xl font-bold">Edit Asset</h1>
          </div>
          <p className="text-muted-foreground">{data.name}</p>
        </div>
      </div>

      {/* Read-Only Information */}
      <div className="rounded-lg border p-6 bg-muted/30">
        <h2 className="text-xl font-semibold mb-4">File Information (Read-Only)</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="font-medium text-muted-foreground">Filename</dt>
            <dd className="mt-1">{data.name || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">File Path</dt>
            <dd className="mt-1 break-all">{data.filepath || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Asset Type</dt>
            <dd className="mt-1">
              <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                {data.assetType || "unknown"}
              </span>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">File Size</dt>
            <dd className="mt-1">{data.fileSizeMb ? `${data.fileSizeMb.toFixed(2)} MB` : "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Duration</dt>
            <dd className="mt-1">{data.duration || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">File Format</dt>
            <dd className="mt-1 uppercase">{data.fileFormat || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Resolution</dt>
            <dd className="mt-1">{data.resolution || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Video Codec</dt>
            <dd className="mt-1">{data.videoCodec || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Audio Codec</dt>
            <dd className="mt-1">{data.audioCodec || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Metadata Source</dt>
            <dd className="mt-1 capitalize">{data.metadataSource || "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Created At</dt>
            <dd className="mt-1">{data.createdAt ? new Date(data.createdAt).toLocaleString() : "—"}</dd>
          </div>
          <div>
            <dt className="font-medium text-muted-foreground">Last Updated</dt>
            <dd className="mt-1">{data.updatedAt ? new Date(data.updatedAt).toLocaleString() : "—"}</dd>
          </div>
        </div>
        {(data.gdriveUrl || data.youtubeLink) && (
          <div className="mt-4 pt-4 border-t">
            <dt className="font-medium text-muted-foreground mb-2">Links</dt>
            <div className="flex gap-3">
              {data.gdriveUrl && data.gdriveUrl.includes('drive.google.com') && (
                <a
                  href={data.gdriveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  📁 Open in Google Drive
                </a>
              )}
              {(data.youtubeLink || (data.gdriveUrl && (data.gdriveUrl.includes('youtube.com') || data.gdriveUrl.includes('youtu.be')))) && (
                <a
                  href={data.youtubeLink || data.gdriveUrl!}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  ▶️ Watch on YouTube
                </a>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Form */}
      <form action={updateAsset.bind(null, params.id)} className="space-y-8">
        {/* Content Section */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Content</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                name="title"
                defaultValue={data.title || ""}
                placeholder="Enter title"
              />
            </div>

            <div>
              <Label htmlFor="category">Category</Label>
              <Input
                id="category"
                name="category"
                defaultValue={data.category || ""}
                placeholder="e.g., Teaching, Practice, Q&A"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="descriptionSummary">Description</Label>
              <Textarea
                id="descriptionSummary"
                name="descriptionSummary"
                defaultValue={data.descriptionSummary || ""}
                placeholder="Brief description of the content"
                rows={4}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="additionalTopics">Additional Topics</Label>
              <Textarea
                id="additionalTopics"
                name="additionalTopics"
                defaultValue={data.additionalTopics || ""}
                placeholder="Additional topics covered in this asset"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Translation Section */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Translation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasOralTranslation"
                name="hasOralTranslation"
                defaultChecked={data.hasOralTranslation || false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="hasOralTranslation" className="font-normal">
                Has Oral Translation
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasSubtitleFiles"
                name="hasSubtitleFiles"
                defaultChecked={data.hasSubtitleFiles || false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="hasSubtitleFiles" className="font-normal">
                Has Subtitle Files
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasTibetanTranscription"
                name="hasTibetanTranscription"
                defaultChecked={data.hasTibetanTranscription || false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="hasTibetanTranscription" className="font-normal">
                Has Tibetan Transcription
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="hasWrittenTranslation"
                name="hasWrittenTranslation"
                defaultChecked={data.hasWrittenTranslation || false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="hasWrittenTranslation" className="font-normal">
                Has Written Translation
              </Label>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="interpreterName">Interpreter Name</Label>
              <Input
                id="interpreterName"
                name="interpreterName"
                defaultValue={data.interpreterName || ""}
                placeholder="Name of interpreter"
              />
            </div>
          </div>
        </div>

        {/* Transcript Section */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Transcript</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="transcriptAvailable"
                name="transcriptAvailable"
                defaultChecked={data.transcriptAvailable || false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="transcriptAvailable" className="font-normal">
                Transcript Available
              </Label>
            </div>

            <div>
              <Label htmlFor="transcriptTimestamped">Timestamped</Label>
              <select
                id="transcriptTimestamped"
                name="transcriptTimestamped"
                defaultValue={data.transcriptTimestamped || "No"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="No">No</option>
                <option value="Yes">Yes</option>
                <option value="Partial">Partial</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="transcriptLanguages">Languages</Label>
              <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mt-2">
                {["EN", "ZH", "Tibetan", "German", "Vietnamese", "French", "Spanish", "Portuguese", "Other"].map((lang) => (
                  <div key={lang} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`transcriptLang-${lang}`}
                      name="transcriptLanguages"
                      value={lang}
                      defaultChecked={data.transcriptLanguages?.includes(lang) || false}
                      className="h-4 w-4 rounded border-gray-300"
                    />
                    <Label htmlFor={`transcriptLang-${lang}`} className="font-normal text-sm">
                      {lang}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="transcriptLocation">Location/URL</Label>
              <Input
                id="transcriptLocation"
                name="transcriptLocation"
                defaultValue={data.transcriptLocation || ""}
                placeholder="URL or path to transcript file"
              />
            </div>
          </div>
        </div>

        {/* Processing Section */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Processing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="processingStatus">Processing Status</Label>
              <select
                id="processingStatus"
                name="processingStatus"
                defaultValue={data.processingStatus || "Raw"}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="Raw">Raw</option>
                <option value="Ready_for_MVP">Ready for MVP</option>
                <option value="Needs_Work">Needs Work</option>
                <option value="In_Progress">In Progress</option>
                <option value="Complete">Complete</option>
                <option value="Published">Published</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="needsDetailedReview"
                name="needsDetailedReview"
                defaultChecked={data.needsDetailedReview || false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="needsDetailedReview" className="font-normal">
                Needs Detailed Review
              </Label>
            </div>
          </div>
        </div>

        {/* Quality Section */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Quality & Editorial</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Audio Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="audioQuality">Audio Quality</Label>
                <select
                  id="audioQuality"
                  name="audioQuality"
                  defaultValue={data.audioQuality || ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Not rated</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="unusable">Unusable</option>
                </select>
              </div>

              <div>
                <Label htmlFor="audioQualityIssues">Audio Issues</Label>
                <Textarea
                  id="audioQualityIssues"
                  name="audioQualityIssues"
                  defaultValue={data.audioQualityIssues || ""}
                  placeholder="Describe any audio problems"
                  rows={3}
                />
              </div>
            </div>

            {/* Video Column */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="videoQuality">Video Quality</Label>
                <select
                  id="videoQuality"
                  name="videoQuality"
                  defaultValue={data.videoQuality || ""}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Not rated</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="unusable">Unusable</option>
                </select>
              </div>

              <div>
                <Label htmlFor="videoQualityIssues">Video Issues</Label>
                <Textarea
                  id="videoQualityIssues"
                  name="videoQualityIssues"
                  defaultValue={data.videoQualityIssues || ""}
                  placeholder="Describe any video problems"
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Needs Editing - full width below */}
          <div className="flex items-center space-x-2 mt-4 pt-4 border-t">
            <input
              type="checkbox"
              id="needsEditing"
              name="needsEditing"
              defaultChecked={data.needsEditing || false}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="needsEditing" className="font-normal">
              Needs Editing
            </Label>
          </div>
        </div>

        {/* Administrative Section */}
        <div id="assignment" className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Administrative</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <EventOrSessionSelect
                events={eventsList}
                sessions={sessionsList}
                defaultEventId={data.eventId}
                defaultSessionId={data.eventSessionId}
              />
            </div>

            <div>
              <Label htmlFor="catalogingStatus">Cataloging Status</Label>
              <select
                id="catalogingStatus"
                name="catalogingStatus"
                defaultValue={data.catalogingStatus || ""}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready">Ready</option>
                <option value="Needs Review">Needs Review</option>
              </select>
            </div>

            <div>
              <Label htmlFor="catalogedBy">Cataloged By</Label>
              <Input
                id="catalogedBy"
                name="catalogedBy"
                defaultValue={data.catalogedBy || ""}
                placeholder="Name"
              />
            </div>

            <div>
              <Label htmlFor="contributorOrg">Contributor Organization</Label>
              <Input
                id="contributorOrg"
                name="contributorOrg"
                defaultValue={data.contributorOrg || ""}
                placeholder="Organization name"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="backedUpLocally"
                  name="backedUpLocally"
                  defaultChecked={data.backedUpLocally || false}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="backedUpLocally" className="font-normal">
                  Backed Up Locally
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="safeToDeleteFromGdrive"
                  name="safeToDeleteFromGdrive"
                  defaultChecked={data.safeToDeleteFromGdrive || false}
                  disabled={data.assetType === 'youtube' || !!data.youtubeLink || (!!data.gdriveUrl && (data.gdriveUrl.includes('youtube.com') || data.gdriveUrl.includes('youtu.be')))}
                  className={`h-4 w-4 rounded border-gray-300 ${(data.assetType === 'youtube' || data.youtubeLink || (data.gdriveUrl && (data.gdriveUrl.includes('youtube.com') || data.gdriveUrl.includes('youtu.be')))) ? 'opacity-50 cursor-not-allowed' : ''}`}
                />
                <Label htmlFor="safeToDeleteFromGdrive" className={`font-normal ${(data.assetType === 'youtube' || data.youtubeLink || (data.gdriveUrl && (data.gdriveUrl.includes('youtube.com') || data.gdriveUrl.includes('youtu.be')))) ? 'text-muted-foreground/50' : ''}`}>
                  Safe to Delete from GDrive {(data.assetType === 'youtube' || data.youtubeLink || (data.gdriveUrl && (data.gdriveUrl.includes('youtube.com') || data.gdriveUrl.includes('youtu.be')))) && '(N/A for YouTube)'}
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="exclude"
                  name="exclude"
                  defaultChecked={data.exclude || false}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="exclude" className="font-normal">
                  Exclude from Archive
                </Label>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={data.notes || ""}
                placeholder="Additional notes or context"
                rows={4}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="additionalMetadata">Additional Metadata (JSON)</Label>
              <Textarea
                id="additionalMetadata"
                name="additionalMetadata"
                defaultValue={data.additionalMetadata ? JSON.stringify(data.additionalMetadata, null, 2) : ""}
                placeholder='{"key": "value"}'
                rows={6}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter valid JSON for additional metadata fields
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/assets/${params.id}`}>Cancel</Link>
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
