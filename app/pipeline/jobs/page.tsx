"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
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

function JobsContent() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("job_type") || "");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Create job state
  const [showCreate, setShowCreate] = useState(false);
  const [newAssetId, setNewAssetId] = useState("");
  const [newJobType, setNewJobType] = useState("ingest");
  const [newTranscriptId, setNewTranscriptId] = useState("");
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Pipeline", href: "/pipeline" },
    { label: "Jobs" },
  ];

  const handleCreateJob = async () => {
    if (!newAssetId.trim()) return;

    setCreateLoading(true);
    setCreateResult(null);

    try {
      const payload: Record<string, any> = {};
      if (newJobType === "sync_transcript" && newTranscriptId.trim()) {
        payload.transcript_id = newTranscriptId.trim();
        payload.force = true;
      }

      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/api/v1/jobs",
          method: "POST",
          data: {
            type: newJobType,
            asset_id: newAssetId.trim(),
            payload,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.status < 400) {
        setCreateResult({ success: true, message: "Job created successfully!" });
        setNewAssetId("");
        setNewTranscriptId("");
        setShowCreate(false);
        setPage(1);
        fetchJobs();
      } else {
        setCreateResult({ success: false, message: data.data?.error || data.error || "Failed to create job" });
      }
    } catch (err: any) {
      setCreateResult({ success: false, message: err.message || "Failed to create job" });
    } finally {
      setCreateLoading(false);
    }
  };

  const fetchJobs = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("endpoint", "/api/v1/jobs");
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("job_type", typeFilter);
      params.append("page", page.toString());
      params.append("per_page", perPage.toString());

      const response = await fetch(`/api/pipeline?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setJobs(data.data.jobs || data.data || []);
        if (data.data.pagination) {
          setPagination(data.data.pagination);
        } else if (data.data.total !== undefined) {
          setPagination({
            page: data.data.page || page,
            per_page: data.data.per_page || perPage,
            total: data.data.total,
            total_pages: data.data.total_pages || Math.ceil(data.data.total / perPage),
          });
        }
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
  }, [statusFilter, typeFilter, page, perPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
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
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? "secondary" : "default"}>
            {showCreate ? "Cancel" : "Create Job"}
          </Button>
          <Button onClick={fetchJobs} variant="outline" disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Create Job Form */}
      {showCreate && (
        <div className="rounded-lg border p-6 bg-muted/30">
          <h2 className="text-lg font-semibold mb-4">Create New Job</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="assetId">Asset ID *</Label>
              <Input
                id="assetId"
                value={newAssetId}
                onChange={(e) => setNewAssetId(e.target.value)}
                placeholder="Enter asset UUID"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobType">Job Type</Label>
              <select
                id="jobType"
                value={newJobType}
                onChange={(e) => setNewJobType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="ingest">Ingest</option>
                <option value="transcode">Transcode</option>
                <option value="transcribe">Transcribe</option>
                <option value="translate">Translate</option>
                <option value="publish">Publish</option>
                <option value="sync_transcript">Sync Transcript</option>
              </select>
            </div>
            {newJobType === "sync_transcript" && (
              <div className="space-y-2">
                <Label htmlFor="transcriptId">Transcript ID</Label>
                <Input
                  id="transcriptId"
                  value={newTranscriptId}
                  onChange={(e) => setNewTranscriptId(e.target.value)}
                  placeholder="Enter transcript UUID"
                />
              </div>
            )}
            <div className="flex items-end">
              <Button
                onClick={handleCreateJob}
                disabled={createLoading || !newAssetId.trim()}
                className="w-full"
              >
                {createLoading ? "Creating..." : "Start Job"}
              </Button>
            </div>
          </div>
          {createResult && (
            <div className={`mt-4 p-3 rounded-md text-sm ${createResult.success ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
              {createResult.message}
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 flex-wrap items-center">
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
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Per page:</span>
          <select
            value={perPage}
            onChange={(e) => setPerPage(Number(e.target.value))}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
        {pagination && (
          <span className="text-sm text-muted-foreground ml-auto">
            Total: {pagination.total} jobs
          </span>
        )}
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
        <div className="lg:col-span-2 space-y-4">
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

          {/* Pagination Controls */}
          {!loading && pagination && pagination.total_pages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Page {pagination.page} of {pagination.total_pages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                >
                  First
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page >= pagination.total_pages}
                >
                  Next
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(pagination.total_pages)}
                  disabled={page >= pagination.total_pages}
                >
                  Last
                </Button>
              </div>
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

export default function JobsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <JobsContent />
    </Suspense>
  );
}
