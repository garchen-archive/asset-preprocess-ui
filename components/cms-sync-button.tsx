"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface CmsSyncStatus {
  ready: boolean;
  checks: {
    event_published: boolean;
    sessions_published: { total: number; published: number };
    assets_published: { total: number; published: number };
    transcripts_published: { total: number; published: number };
    collection_ready: boolean;
  };
  blocking?: string[];
}

interface CmsSyncButtonProps {
  eventId: string;
  eventName: string;
}

export function CmsSyncButton({ eventId, eventName }: CmsSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<CmsSyncStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  // Fetch CMS sync status on mount
  useEffect(() => {
    const fetchStatus = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/pipeline", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/api/v1/admin/events/${eventId}/cms-sync/check`,
            method: "GET",
          }),
        });

        const result = await response.json();

        if (!response.ok || result.status >= 400) {
          throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
        }

        setStatus(result.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch sync status");
      } finally {
        setIsLoading(false);
      }
    };

    fetchStatus();
  }, [eventId]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/events/${eventId}/cms-sync?refresh_transcripts=true`,
          method: "POST",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Content synced to CMS",
        description: `"${eventName}" content has been prepared and synced.`,
      });

      setIsOpen(false);
      router.refresh();
    } catch (err) {
      toast({
        title: "Sync failed",
        description: err instanceof Error ? err.message : "Failed to sync to CMS",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Build list of blocking reasons
  const getBlockingReasons = (): string[] => {
    if (!status) return [];
    if (status.blocking?.length) return status.blocking;

    const reasons: string[] = [];
    if (!status.checks.event_published) {
      reasons.push("Event not published");
    }
    if (status.checks.sessions_published.published < status.checks.sessions_published.total) {
      const unpublished = status.checks.sessions_published.total - status.checks.sessions_published.published;
      reasons.push(`${unpublished} session${unpublished > 1 ? "s" : ""} not published`);
    }
    if (status.checks.assets_published.published < status.checks.assets_published.total) {
      const unpublished = status.checks.assets_published.total - status.checks.assets_published.published;
      reasons.push(`${unpublished} asset${unpublished > 1 ? "s" : ""} not published`);
    }
    if (status.checks.transcripts_published.published < status.checks.transcripts_published.total) {
      const unpublished = status.checks.transcripts_published.total - status.checks.transcripts_published.published;
      reasons.push(`${unpublished} transcript${unpublished > 1 ? "s" : ""} not published`);
    }
    if (!status.checks.collection_ready) {
      reasons.push("No published collection");
    }
    return reasons;
  };

  // Loading state
  if (isLoading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <span className="animate-pulse">Checking...</span>
      </Button>
    );
  }

  // Error state
  if (error) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-muted-foreground">
            Sync to CMS
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-3">
          <p className="text-sm text-destructive">{error}</p>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Not ready - show dropdown with blocking reasons
  if (status && !status.ready) {
    const blockingReasons = getBlockingReasons();
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-muted-foreground">
            Sync to CMS
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-72 p-3">
          <p className="font-medium text-sm mb-2">Not ready for CMS sync</p>
          <ul className="text-sm space-y-1 mb-3">
            {blockingReasons.map((reason, i) => (
              <li key={i} className="text-muted-foreground flex items-start gap-2">
                <span className="text-destructive">-</span>
                {reason}
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground border-t pt-2">
            Click "Publish All" first to publish all content.
          </p>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Ready - show enabled button with confirmation dialog
  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm">
          Sync to CMS
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Sync to CMS?</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                This will prepare and sync English content for <strong>"{eventName}"</strong> to the public CMS.
              </p>
              {status && (
                <div className="rounded-md border p-3 bg-muted/50">
                  <p className="text-sm font-medium mb-2">Content to sync:</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex justify-between">
                      <span>Sessions:</span>
                      <Badge variant="secondary">{status.checks.sessions_published.total}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Assets:</span>
                      <Badge variant="secondary">{status.checks.assets_published.total}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Transcripts:</span>
                      <Badge variant="secondary">{status.checks.transcripts_published.total}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Collection:</span>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">Ready</Badge>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isSyncing}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? "Syncing..." : "Sync to CMS"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
