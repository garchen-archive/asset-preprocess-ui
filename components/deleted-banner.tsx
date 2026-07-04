"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface DeletedBannerProps {
  entityType: "asset" | "event" | "session" | "transcript";
  entityId: string;
  deletedAt: Date | string;
  /** If true, show restore button */
  canRestore?: boolean;
}

export function DeletedBanner({
  entityType,
  entityId,
  deletedAt,
  canRestore = true,
}: DeletedBannerProps) {
  const [isRestoring, setIsRestoring] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const deletedDate = deletedAt instanceof Date
    ? deletedAt
    : new Date(deletedAt);

  const handleRestore = async () => {
    if (!confirm(`Are you sure you want to restore this ${entityType}?`)) {
      return;
    }

    setIsRestoring(true);
    try {
      // Map entity type to restore API endpoint (POST to /restore)
      const endpointMap: Record<string, string> = {
        asset: `/api/v1/assets/${entityId}/restore`,
        event: `/api/v1/admin/events/${entityId}/restore`,
        session: `/api/v1/admin/sessions/${entityId}/restore`,
        transcript: `/api/v1/transcripts/${entityId}/restore`,
      };

      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: endpointMap[entityType],
          method: "POST",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        const errorMessage = result.message || result.data?.message || result.data?.error || `HTTP ${result.status}`;
        throw new Error(errorMessage);
      }

      toast({
        title: "Restored",
        description: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} has been restored.`,
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Restore failed",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-red-300 bg-red-50 p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0">
            <svg
              className="h-6 w-6 text-red-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-red-800">
              This {entityType} has been deleted
            </h3>
            <p className="text-sm text-red-700">
              Deleted on {deletedDate.toLocaleDateString()} at {deletedDate.toLocaleTimeString()}
            </p>
          </div>
        </div>
        {canRestore && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRestore}
            disabled={isRestoring}
            className="border-red-300 text-red-700 hover:bg-red-100"
          >
            {isRestoring ? "Restoring..." : "Restore"}
          </Button>
        )}
      </div>
    </div>
  );
}
