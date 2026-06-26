"use client";

import { useState } from "react";
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
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PublishEventButtonProps {
  eventId: string;
  eventName: string;
  sessionCount: number;
  variant?: "publish" | "unpublish";
}

export function PublishEventButton({
  eventId,
  eventName,
  sessionCount,
  variant = "publish",
}: PublishEventButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const isUnpublish = variant === "unpublish";

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/events/${eventId}/${variant}`,
          method: "POST",
          data: {
            cascade: true,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: isUnpublish ? "Event unpublished" : "Event published",
        description: isUnpublish
          ? `"${eventName}" and all content has been unpublished.`
          : `"${eventName}" and all content has been published.`,
      });

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${variant}`,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant={isUnpublish ? "destructive" : "default"}
          size="sm"
        >
          {isUnpublish ? "Unpublish All" : "Publish All"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isUnpublish ? "Unpublish Event?" : "Publish Event?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isUnpublish ? (
              <>
                This will unpublish <strong>"{eventName}"</strong> and all its sessions, assets, and transcripts.
                All items will be set back to "draft" status.
              </>
            ) : (
              <>
                This will publish <strong>"{eventName}"</strong> and all its sessions ({sessionCount}), assets, and transcripts.
                All items will be set to "published" status.
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={cn(
              isUnpublish && buttonVariants({ variant: "destructive" })
            )}
          >
            {isLoading
              ? isUnpublish
                ? "Unpublishing..."
                : "Publishing..."
              : isUnpublish
              ? "Unpublish All"
              : "Publish All"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
