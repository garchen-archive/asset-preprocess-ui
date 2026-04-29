"use client";

import { useState } from "react";
import Link from "next/link";
import { UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";
import { useToast } from "@/components/ui/use-toast";
import { ToastAction } from "@/components/ui/toast";

type ImportMode = "single" | "folder" | "upload";
type Provider = "backblaze" | "gdrive";

interface ImportResult {
  success: boolean;
  message: string;
  data?: any;
  jobId?: string;
}

export default function StorageImportPage() {
  const [mode, setMode] = useState<ImportMode>("single");
  const [provider, setProvider] = useState<Provider>("backblaze");
  const [fileId, setFileId] = useState("");
  const [folderId, setFolderId] = useState("");
  const [recursive, setRecursive] = useState(true);
  const [extensions, setExtensions] = useState(".mp4,.mov,.mp3,.wav,.m4a");
  const [extractMetadata, setExtractMetadata] = useState(true);
  const [triggerIngestion, setTriggerIngestion] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // Upload mode state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadDirectory, setUploadDirectory] = useState("");
  const { toast } = useToast();

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Pipeline", href: "/pipeline" },
    { label: "Import" },
  ];

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setResult(null);

    // Show initial toast
    const { id, update, dismiss } = toast({
      title: "Uploading file...",
      description: selectedFile.name,
      duration: Infinity, // Don't auto-dismiss during upload
    });

    try {
      // 1. Upload file
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("provider", provider);
      if (uploadDirectory) {
        formData.append("directory", uploadDirectory);
      }

      const uploadRes = await fetch("/api/pipeline/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const errorData = await uploadRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }
      const uploadData = await uploadRes.json();

      // 2. Trigger import
      update({
        id,
        title: "Processing...",
        description: "Creating asset record",
      });

      const importRes = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/api/v1/admin/assets/import",
          method: "POST",
          data: {
            provider,
            file_id: uploadData.key,
            extract_metadata: extractMetadata,
            trigger_ingestion: triggerIngestion,
          },
        }),
      });

      const importData = await importRes.json();

      if (!importRes.ok || importData.status >= 400) {
        throw new Error(importData.data?.error || importData.error || "Import failed");
      }

      // 3. Show success
      const assetId = importData.data?.asset?.id;
      const isCreated = importData.status === 201;
      const isUpdated = importData.status === 200;

      update({
        id,
        title: "Upload complete!",
        description: "Asset created successfully",
        action: assetId ? (
          <ToastAction altText="View asset" asChild>
            <Link href={`/assets/${assetId}`}>View Asset</Link>
          </ToastAction>
        ) : undefined,
        duration: 5000,
      });

      // Update result panel
      setResult({
        success: true,
        message: isCreated
          ? "New asset created successfully!"
          : isUpdated
            ? "Existing asset updated."
            : "File uploaded and imported successfully!",
        data: importData.data,
        jobId: importData.data?.job_id,
      });

      // Clear file selection
      setSelectedFile(null);

    } catch (error: any) {
      update({
        id,
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
        duration: 5000,
      });

      // Update result panel with error
      setResult({
        success: false,
        message: error.message || "Upload failed",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleImport = async () => {
    setLoading(true);
    setResult(null);

    try {
      const data = mode === "single"
        ? {
            provider,
            file_id: fileId,
            extract_metadata: extractMetadata,
            trigger_ingestion: triggerIngestion,
          }
        : {
            provider,
            folder_id: folderId,
            recursive,
            extensions: extensions.split(",").map(e => e.trim()).filter(Boolean),
            extract_metadata: extractMetadata,
            trigger_ingestion: triggerIngestion,
            dry_run: dryRun,
          };

      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: "/api/v1/admin/assets/import",
          method: "POST",
          data,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.status < 400) {
        const isCreated = responseData.status === 201;
        const isUpdated = responseData.status === 200;
        setResult({
          success: true,
          message: dryRun
            ? `Dry run complete. Found ${responseData.data?.files?.length || 0} files.`
            : mode === "single"
              ? isCreated
                ? "New asset created successfully!"
                : isUpdated
                  ? "Existing asset updated."
                  : "File imported successfully!"
              : "Folder import job started!",
          data: responseData.data,
          jobId: responseData.data?.job_id,
        });
      } else {
        setResult({
          success: false,
          message: responseData.data?.error || responseData.error || "Import failed",
          data: responseData.data,
        });
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || "Failed to connect to pipeline API",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div>
        <h1 className="text-3xl font-bold">Asset Import</h1>
        <p className="text-muted-foreground">
          Import files from cloud storage into the archive database
        </p>
      </div>

      {/* Mode Selection */}
      <div className="flex gap-2">
        <Button
          variant={mode === "single" ? "default" : "outline"}
          onClick={() => setMode("single")}
        >
          Single File
        </Button>
        <Button
          variant={mode === "folder" ? "default" : "outline"}
          onClick={() => setMode("folder")}
        >
          Folder
        </Button>
        <Button
          variant={mode === "upload" ? "default" : "outline"}
          onClick={() => setMode("upload")}
        >
          <UploadCloud className="h-4 w-4 mr-2" />
          Upload File
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <div className="rounded-lg border p-6 space-y-6">
          <div>
            <h2 className="text-xl font-semibold mb-4">
              {mode === "single" ? "Import Single File" : mode === "folder" ? "Import Folder" : "Upload File"}
            </h2>

            {/* Provider Selection */}
            <div className="space-y-2 mb-4">
              <Label>Storage Provider</Label>
              <div className="flex gap-2">
                {(["backblaze", "gdrive"] as Provider[]).map((p) => (
                  <Button
                    key={p}
                    size="sm"
                    variant={provider === p ? "default" : "outline"}
                    onClick={() => setProvider(p)}
                  >
                    {p === "backblaze" ? "Backblaze" : "Google Drive"}
                  </Button>
                ))}
              </div>
            </div>

            {/* Upload Mode - File Drop Zone */}
            {mode === "upload" && (
              <div className="space-y-4 mb-4">
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25"
                  }`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) setSelectedFile(file);
                  }}
                >
                  <input
                    type="file"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    accept=".mp4,.mov,.mp3,.wav,.m4a,.mkv,.avi"
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    {selectedFile ? (
                      <div>
                        <p className="font-medium">{selectedFile.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(selectedFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Click or drop to change file
                        </p>
                      </div>
                    ) : (
                      <div>
                        <UploadCloud className="mx-auto h-12 w-12 text-muted-foreground" />
                        <p className="mt-2">Drop a file here or click to browse</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Supports: .mp4, .mov, .mp3, .wav, .m4a, .mkv, .avi
                        </p>
                      </div>
                    )}
                  </label>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="uploadDirectory">Directory Path (optional)</Label>
                  <Input
                    id="uploadDirectory"
                    value={uploadDirectory}
                    onChange={(e) => setUploadDirectory(e.target.value)}
                    placeholder="media/2024/videos"
                  />
                  <p className="text-xs text-muted-foreground">
                    Storage path prefix. Leave empty to upload to root.
                  </p>
                </div>
              </div>
            )}

            {/* File/Folder ID */}
            {mode === "single" && (
              <div className="space-y-2 mb-4">
                <Label htmlFor="fileId">
                  {provider === "gdrive" ? "File ID" : "Object Key (path)"}
                </Label>
                <Input
                  id="fileId"
                  value={fileId}
                  onChange={(e) => setFileId(e.target.value)}
                  placeholder={
                    provider === "gdrive"
                      ? "1ABC123def..."
                      : "media/2024/video.mp4"
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {provider === "gdrive"
                    ? "The file ID from the Google Drive URL"
                    : "The full path/key to the file in the bucket"}
                </p>
              </div>
            )}

            {mode === "folder" && (
              <>
                <div className="space-y-2 mb-4">
                  <Label htmlFor="folderId">
                    {provider === "gdrive" ? "Folder ID" : "Folder Path (prefix)"}
                  </Label>
                  <Input
                    id="folderId"
                    value={folderId}
                    onChange={(e) => setFolderId(e.target.value)}
                    placeholder={
                      provider === "gdrive"
                        ? "1ABC123def..."
                        : "media/2024/"
                    }
                  />
                </div>

                <div className="space-y-2 mb-4">
                  <Label htmlFor="extensions">File Extensions (comma-separated)</Label>
                  <Input
                    id="extensions"
                    value={extensions}
                    onChange={(e) => setExtensions(e.target.value)}
                    placeholder=".mp4,.mov,.mp3"
                  />
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <input
                    id="recursive"
                    type="checkbox"
                    checked={recursive}
                    onChange={(e) => setRecursive(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="recursive" className="mb-0">Include subfolders</Label>
                </div>
              </>
            )}

            {/* Options */}
            <div className="space-y-3 pt-4 border-t">
              <div className="flex items-center gap-2">
                <input
                  id="extractMetadata"
                  type="checkbox"
                  checked={extractMetadata}
                  onChange={(e) => setExtractMetadata(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="extractMetadata" className="mb-0">
                  Extract technical metadata (ffprobe)
                </Label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  id="triggerIngestion"
                  type="checkbox"
                  checked={triggerIngestion}
                  onChange={(e) => setTriggerIngestion(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="triggerIngestion" className="mb-0">
                  Start full processing pipeline after import
                </Label>
              </div>

              {mode === "folder" && (
                <div className="flex items-center gap-2">
                  <input
                    id="dryRun"
                    type="checkbox"
                    checked={dryRun}
                    onChange={(e) => setDryRun(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="dryRun" className="mb-0">
                    Dry run (preview files without importing)
                  </Label>
                </div>
              )}
            </div>
          </div>

          {mode === "upload" ? (
            <Button
              onClick={handleUpload}
              disabled={uploading || !selectedFile}
              className="w-full"
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={loading || (mode === "single" ? !fileId : !folderId)}
              className="w-full"
            >
              {loading ? "Processing..." : dryRun ? "Preview Files" : "Import"}
            </Button>
          )}
        </div>

        {/* Results */}
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Result</h2>

          {!result && !loading && !uploading && (
            <div className="text-center py-12 text-muted-foreground">
              <p>Import results will appear here</p>
            </div>
          )}

          {(loading || uploading) && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              <p className="mt-4 text-muted-foreground">
                {uploading ? "Uploading..." : "Processing..."}
              </p>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              <div className={`p-4 rounded-lg ${result.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                <div className="flex items-center gap-2">
                  {result.success ? (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={result.success ? "text-green-800" : "text-red-800"}>
                    {result.message}
                  </span>
                </div>
              </div>

              {result.jobId && (
                <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                  <p className="text-sm text-blue-800">
                    Job ID: <code className="font-mono">{result.jobId}</code>
                  </p>
                  <Link
                    href={`/pipeline/jobs?job_id=${result.jobId}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View job status →
                  </Link>
                </div>
              )}

              {(result.data?.asset || result.data?.asset_id) && (
                <div className="space-y-2">
                  <h3 className="font-medium">Asset Created/Updated</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-muted-foreground">ID:</span>{" "}
                      <code className="font-mono">{result.data.asset?.id || result.data.asset_id}</code>
                    </p>
                    {(result.data.asset?.title || result.data.name) && (
                      <p>
                        <span className="text-muted-foreground">Name:</span>{" "}
                        {result.data.asset?.title || result.data.name}
                      </p>
                    )}
                    {(result.data.asset?.filepath || result.data.filepath) && (
                      <p>
                        <span className="text-muted-foreground">Path:</span>{" "}
                        <code className="font-mono text-xs">{result.data.asset?.filepath || result.data.filepath}</code>
                      </p>
                    )}
                  </div>
                  <Link
                    href={`/assets/${result.data.asset?.id || result.data.asset_id}`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View asset →
                  </Link>
                </div>
              )}

              {result.data?.files && result.data.files.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Files Found ({result.data.files.length})</h3>
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left">Path</th>
                          <th className="px-3 py-2 text-right">Size</th>
                        </tr>
                      </thead>
                      <tbody>
                        {result.data.files.map((file: any, idx: number) => (
                          <tr key={idx} className="border-t">
                            <td className="px-3 py-2 font-mono text-xs truncate max-w-[300px]">
                              {file.path || file.name}
                            </td>
                            <td className="px-3 py-2 text-right text-muted-foreground">
                              {file.size ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
