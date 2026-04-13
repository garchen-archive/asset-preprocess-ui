import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default function PipelinePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Content Processing Pipeline</h1>
        <p className="text-muted-foreground">
          Import files from storage and manage processing workflows
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Asset Import */}
        <div className="rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Asset Import</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Import files from Backblaze, Google Drive, or S3 into the archive database.
          </p>
          <Button asChild>
            <Link href="/pipeline/import">Import Files</Link>
          </Button>
        </div>

        {/* Workflows */}
        <div className="rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-purple-100 text-purple-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Workflows</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            View and manage processing workflows (full processing, transcription, publication).
          </p>
          <Button asChild variant="outline">
            <Link href="/pipeline/workflows">View Workflows</Link>
          </Button>
        </div>

        {/* Jobs */}
        <div className="rounded-lg border p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-green-100 text-green-700">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold">Jobs</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Monitor individual processing jobs (ingest, transcode, transcribe, publish).
          </p>
          <Button asChild variant="outline">
            <Link href="/pipeline/jobs">View Jobs</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
