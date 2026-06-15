"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { GenerateCollectionModal } from "./generate-collection-modal";

interface Session {
  id: string;
  sessionName: string;
  dayNumber?: number | null;
  dayLabel?: string | null;
  sessionDate?: string | null;
}

interface GenerateCollectionButtonProps {
  eventId: string;
  eventName?: string;
  sessions?: Session[];
  hasExistingCollection: boolean;
}

export function GenerateCollectionButton({
  eventId,
  eventName = "Event",
  sessions = [],
  hasExistingCollection,
}: GenerateCollectionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showOverwriteWarning, setShowOverwriteWarning] = useState(false);
  const { toast } = useToast();

  // Quick generate without modal (for simple use case)
  const handleQuickGenerate = async (overwrite: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/events/${eventId}/collections/generate-default`,
          method: "POST",
          data: {
            overwrite_existing: overwrite,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: overwrite ? "Collection regenerated" : "Collection generated",
        description: `Created ${result.data?.items?.length || 0} items from sessions`,
      });

      // Reload the page to show updated data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate collection",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // If sessions are provided, show the modal option
  const hasSessions = sessions.length > 0;

  const handleRegenerateClick = () => {
    if (hasExistingCollection) {
      setShowOverwriteWarning(true);
    } else if (hasSessions) {
      setShowModal(true);
    } else {
      handleQuickGenerate(false);
    }
  };

  const handleConfirmRegenerate = () => {
    setShowOverwriteWarning(false);
    if (hasSessions) {
      setShowModal(true);
    } else {
      handleQuickGenerate(true);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {hasExistingCollection ? (
          <Button
            size="sm"
            variant="outline"
            onClick={handleRegenerateClick}
            disabled={isLoading}
          >
            {isLoading ? "Regenerating..." : "Regenerate"}
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={() => hasSessions ? setShowModal(true) : handleQuickGenerate(false)}
            disabled={isLoading}
          >
            {isLoading ? "Generating..." : "Generate Default"}
          </Button>
        )}
      </div>

      {/* Overwrite Warning Dialog */}
      {showOverwriteWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-amber-700 mb-2">
              Regenerate Collection?
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              This will <strong>replace all existing items</strong> in the collection.
              Any manual changes you've made (removed items, reordering, custom labels) will be lost.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowOverwriteWarning(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleConfirmRegenerate}
              >
                Regenerate Anyway
              </Button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <GenerateCollectionModal
          eventId={eventId}
          eventName={eventName}
          sessions={sessions}
          hasExistingCollection={hasExistingCollection}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            // Page will reload in the modal
          }}
        />
      )}
    </>
  );
}
