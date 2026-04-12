"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";

interface Workflow {
  id: string;
  asset_id: string;
  workflow_type: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
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

function WorkflowsContent() {
  const searchParams = useSearchParams();
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [typeFilter, setTypeFilter] = useState(searchParams.get("workflow_type") || "");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);

  // Create workflow state
  const [showCreate, setShowCreate] = useState(false);
  const [newAssetId, setNewAssetId] = useState("");
  const [newWorkflowType, setNewWorkflowType] = useState("full_processing");
  const [createLoading, setCreateLoading] = useState(false);
  const [createResult, setCreateResult] = useState<{ success: boolean; message: string } | null>(null);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Pipeline", href: "/pipeline" },
    { label: "Workflows" },
  ];

  const fetchWorkflows = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.append("endpoint", "/api/v1/workflows");
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("workflow_type", typeFilter);
      params.append("page", page.toString());
      params.append("per_page", perPage.toString());

      const response = await fetch(`/api/pipeline?${params.toString()}`);
      const data = await response.json();

      if (response.ok && data.data) {
        setWorkflows(data.data.workflows || data.data || []);
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
        setError(data.error || "Failed to fetch workflows");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect to pipeline API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, [statusFilter, typeFilter, page, perPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, typeFilter]);

  const handleAction = async (workflowId: string, action: "cancel" | "retry") => {
    setActionLoading(workflowId);

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/workflows/${workflowId}/${action}`,
          method: "POST",
        }),
      });

      if (response.ok) {
        fetchWorkflows();
      }
    } catch (err) {
      console.error("Action failed:", err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateWorkflow = async () => {
    if (!newAssetId.trim()) return;

    setCreateLoading(true);
    setCreateResult(null);

    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/api/v1/workflows",
          method: "POST",
          data: {
            asset_id: newAssetId.trim(),
            workflow_type: newWorkflowType,
          },
        }),
      });

      const data = await response.json();

      if (response.ok && data.status < 400) {
        setCreateResult({ success: true, message: "Workflow created successfully!" });
        setNewAssetId("");
        setShowCreate(false);
        setPage(1);
        fetchWorkflows();
      } else {
        setCreateResult({ success: false, message: data.data?.error || data.error || "Failed to create workflow" });
      }
    } catch (err: any) {
      setCreateResult({ success: false, message: err.message || "Failed to create workflow" });
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Workflows</h1>
          <p className="text-muted-foreground">
            View and manage processing workflows
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setShowCreate(!showCreate)} variant={showCreate ? "secondary" : "default"}>
            {showCreate ? "Cancel" : "Create Workflow"}
          </Button>
          <Button onClick={fetchWorkflows} variant="outline" disabled={loading}>
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Create Workflow Form */}
      {showCreate && (
        <div className="rounded-lg border p-6 bg-muted/30">
          <h2 className="text-lg font-semibold mb-4">Create New Workflow</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
              <Label htmlFor="workflowType">Workflow Type</Label>
              <select
                id="workflowType"
                value={newWorkflowType}
                onChange={(e) => setNewWorkflowType(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="full_processing">Full Processing</option>
                <option value="transcription_only">Transcription Only</option>
                <option value="publish_only">Publish Only</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleCreateWorkflow}
                disabled={createLoading || !newAssetId.trim()}
                className="w-full"
              >
                {createLoading ? "Creating..." : "Start Workflow"}
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
            <option value="full_processing">Full Processing</option>
            <option value="transcription_only">Transcription Only</option>
            <option value="publish_only">Publish Only</option>
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
            Total: {pagination.total} workflows
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
          <p className="mt-4 text-muted-foreground">Loading workflows...</p>
        </div>
      )}

      {/* Workflows Table */}
      {!loading && workflows.length > 0 && (
        <div className="rounded-md border">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left text-sm font-medium">ID</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Asset</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {workflows.map((workflow) => (
                <tr key={workflow.id} className="border-b hover:bg-muted/50">
                  <td className="px-4 py-3 text-sm font-mono">
                    {workflow.id.slice(0, 8)}...
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Link
                      href={`/assets/${workflow.asset_id}`}
                      className="text-blue-600 hover:underline font-mono"
                    >
                      {workflow.asset_id.slice(0, 8)}...
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge variant="outline">
                      {workflow.workflow_type.replace(/_/g, " ")}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <Badge className={statusColors[workflow.status] || ""}>
                      {workflow.status}
                    </Badge>
                    {workflow.error_message && (
                      <p className="text-xs text-red-600 mt-1 max-w-[200px] truncate" title={workflow.error_message}>
                        {workflow.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {new Date(workflow.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <div className="flex gap-2">
                      {(workflow.status === "pending" || workflow.status === "processing") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(workflow.id, "cancel")}
                          disabled={actionLoading === workflow.id}
                        >
                          Cancel
                        </Button>
                      )}
                      {workflow.status === "failed" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(workflow.id, "retry")}
                          disabled={actionLoading === workflow.id}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
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
      {!loading && workflows.length === 0 && !error && (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No workflows found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Start a workflow by importing files with the ingestion pipeline enabled
          </p>
        </div>
      )}
    </div>
  );
}

export default function WorkflowsPage() {
  return (
    <Suspense fallback={<div className="text-center py-12">Loading...</div>}>
      <WorkflowsContent />
    </Suspense>
  );
}
