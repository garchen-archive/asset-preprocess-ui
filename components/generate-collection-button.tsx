"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

interface GenerateCollectionButtonProps {
  eventId: string;
  hasExistingCollection: boolean;
  pipelineUrl?: string;
}

export function GenerateCollectionButton({
  eventId,
  hasExistingCollection,
  pipelineUrl = process.env.NEXT_PUBLIC_PIPELINE_URL || "http://localhost:8080",
}: GenerateCollectionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (overwrite: boolean = false) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${pipelineUrl}/api/v1/admin/events/${eventId}/collections/generate-default`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-API-Key": process.env.NEXT_PUBLIC_PIPELINE_API_KEY || "test-key",
          },
          body: JSON.stringify({
            overwrite_existing: overwrite,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `HTTP ${response.status}`);
      }

      const data = await response.json();

      toast({
        title: overwrite ? "Collection regenerated" : "Collection generated",
        description: `Created ${data.item_count || 0} items from sessions`,
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
