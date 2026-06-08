"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface GenerateCollectionButtonProps {
  eventId: string;
  hasExistingCollection: boolean;
}

export function GenerateCollectionButton({
  eventId,
  hasExistingCollection,
}: GenerateCollectionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (overwrite: boolean = false) => {
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
        description: `Created ${result.data?.item_count || 0} items from sessions`,
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

  return (
    <div className="flex gap-2">
      {hasExistingCollection ? (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleGenerate(true)}
          disabled={isLoading}
        >
          {isLoading ? "Regenerating..." : "Regenerate"}
        </Button>
      ) : (
        <Button
          size="sm"
          onClick={() => handleGenerate(false)}
          disabled={isLoading}
        >
          {isLoading ? "Generating..." : "Generate Default"}
        </Button>
      )}
    </div>
  );
}
