"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";

interface Job {
  id: string;
  workflow_id?: string;
  asset_id?: string;
  job_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
  result_data?: any;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  processing: "bg-blue-100 text-blue-800 border-blue-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  failed: "bg-red-100 text-red-800 border-red-200",
  cancelled: "bg-gray-100 text-gray-800 border-gray-200",
};

const jobTypeColors: Record<string, string> = {
  ingest: "bg-cyan-50 text-cyan-700 border-cyan-200",
  transcode: "bg-purple-50 text-purple-700 border-purple-200",
  transcribe: "bg-orange-50 text-orange-700 border-orange-200",
  translate: "bg-pink-50 text-pink-700 border-pink-200",
  publish: "bg-green-50 text-green-700 border-green-200",
  sync_transcript: "bg-indigo-50 text-indigo-700 border-indigo-200",
  storage_import: "bg-blue-50 text-blue-700 border-blue-200",
  folder_import: "bg-teal-50 text-teal-700 border-teal-200",
};

export default function JobsPage() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("job_type") || "");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Pipeline", href: "/pipeline" },
    { label: "Jobs" },
  ];

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("endpoint", "/api/v1/jobs");
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("job_type", typeFilter);

      const response = await fetch(`/api/pipeline?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setJobs(data.data.jobs || data.data || []);
      } else {
        setError(data.error || "Failed to fetch jobs");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to pipeline API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, [statusFilter, typeFilter]);

  // Auto-refresh for pending/processing jobs
  useEffect(() => {
    const hasActiveJobs = jobs.some(j => j.status === "pending" || j.status === "processing");
    if (hasActiveJobs) {
      const interval = setInterval(fetchJobs, 5000);
      return () => clearInterval(interval);
    }
  }, [jobs]);

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">
            Monitor processing jobs
          </p>
        </div>
        <Button onClick={fetchJobs} variant="outline" disabled={loading}>
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="">All</option>
            <option value="ingest">Ingest</option>
            <option value="transcode">Transcode</option>
            <option value="transcribe">Transcribe</option>
            <option value="translate">Translate</option>
            <option value="publish">Publish</option>
            <option value="sync_transcript">Sync Transcript</option>
            <option value="storage_import">Storage Import</option>
            <option value="folder_import">Folder Import</option>
          </select>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
          {error}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-4 text-muted-foreground">Loading jobs...</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs Table */}
        <div className="lg:col-span-2">
          {!loading && jobs.length > 0 && (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job) => (
                    <tr
                      key={job.id}
                      className={`border-b hover:bg-muted/50 cursor-pointer ${selectedJob?.id === job.id ? "bg-muted/50" : ""}`}
                      onClick={() => setSelectedJob(job)}
                    >
                      <td className="px-4 py-3 text-sm font-mono">
                        {job.id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className={jobTypeColors[job.job_type] || "bg-gray-50"}>
                          {job.job_type.replace(/_/g, " ")}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge className={statusColors[job.status] || ""}>
                          {job.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(job.created_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Empty State */}
          {!loading && jobs.length === 0 && !error && (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <p className="text-muted-foreground">No jobs found</p>
            </div>
          )}
        </div>

        {/* Job Details Panel */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Job Details</h2>

          {!selectedJob && (
            <div className="text-center py-8 text-muted-foreground">
              <p>Select a job to view details</p>
            </div>
          )}

          {selectedJob && (
            <div className="space-y-4">
              <div>
                <span className="text-sm text-muted-foreground">ID</span>
                <p className="font-mono text-sm">{selectedJob.id}</p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Type</span>
                <p>
                  <Badge className={jobTypeColors[selectedJob.job_type] || "bg-gray-50"}>
                    {selectedJob.job_type.replace(/_/g, " ")}
                  </Badge>
                </p>
              </div>

              <div>
                <span className="text-sm text-muted-foreground">Status</span>
                <p>
                  <Badge className={statusColors[selectedJob.status] || ""}>
                    {selectedJob.status}
                  </Badge>
                </p>
              </div>

              {selectedJob.asset_id && (
                <div>
                  <span className="text-sm text-muted-foreground">Asset</span>
                  <p>
                    <Link
                      href={`/assets/${selectedJob.asset_id}`}
                      className="text-blue-600 hover:underline font-mono text-sm"
                    >
                      {selectedJob.asset_id}
                    </Link>
                  </p>
                </div>
              )}

              {selectedJob.workflow_id && (
                <div>
                  <span className="text-sm text-muted-foreground">Workflow</span>
                  <p className="font-mono text-sm">{selectedJob.workflow_id}</p>
                </div>
              )}

              <div>
                <span className="text-sm text-muted-foreground">Created</span>
                <p className="text-sm">{new Date(selectedJob.created_at).toLocaleString()}</p>
              </div>

              {selectedJob.started_at && (
                <div>
                  <span className="text-sm text-muted-foreground">Started</span>
                  <p className="text-sm">{new Date(selectedJob.started_at).toLocaleString()}</p>
                </div>
              )}

              {selectedJob.completed_at && (
                <div>
                  <span className="text-sm text-muted-foreground">Completed</span>
                  <p className="text-sm">{new Date(selectedJob.completed_at).toLocaleString()}</p>
                </div>
              )}

              {selectedJob.error_message && (
                <div>
                  <span className="text-sm text-muted-foreground">Error</span>
                  <p className="text-sm text-red-600 bg-red-50 p-2 rounded mt-1">
                    {selectedJob.error_message}
                  </p>
                </div>
              )}

              {selectedJob.result_data && (
                <div>
                  <span className="text-sm text-muted-foreground">Result Data</span>
                  <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-auto max-h-48">
                    {JSON.stringify(selectedJob.result_data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
