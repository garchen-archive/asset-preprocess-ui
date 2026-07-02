"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface RefreshMetadataButtonProps {
  assetId: string;
}

export function RefreshMetadataButton({ assetId }: RefreshMetadataButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}/refresh-metadata`,
          method: "POST",
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        // Handle error response: { error: true, message: "..." } or { data: { error: "...", message: "..." } }
        const errorMessage = result.message || result.data?.message || result.data?.error || `HTTP ${result.status}`;
        throw new Error(errorMessage);
      }

      const data = result.data;
      toast({
        title: "Metadata refreshed",
        description: data.message || `Updated: ${data.asset_type || "unknown"} (${data.file_format || "unknown"})`,
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Failed to refresh metadata",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRefresh}
      disabled={isLoading}
    >
      {isLoading ? "Refreshing..." : "Refresh Metadata"}
    </Button>
  );
}
