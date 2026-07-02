"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface ThumbnailTimeInputProps {
  assetId: string;
  currentTime?: number | null;
  duration?: number | null;
}

export function ThumbnailTimeInput({ assetId, currentTime, duration }: ThumbnailTimeInputProps) {
  const [time, setTime] = useState<string>(currentTime?.toString() || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSave = async () => {
    const timeValue = parseFloat(time);
    if (isNaN(timeValue) || timeValue < 0) {
      toast({
        title: "Invalid time",
        description: "Please enter a valid time in seconds",
        variant: "destructive",
      });
      return;
    }

    if (duration && timeValue > duration) {
      toast({
        title: "Invalid time",
        description: `Time cannot exceed duration (${duration}s)`,
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}`,
          method: "PATCH",
          data: {
            metadata: {
              technical: {
                thumbnail_time: timeValue,
              },
            },
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        const errorMessage = result.message || result.data?.message || result.data?.error || `HTTP ${result.status}`;
        throw new Error(errorMessage);
      }

      toast({
        title: "Thumbnail time saved",
        description: `Thumbnail will be generated at ${timeValue} seconds`,
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Failed to save thumbnail time",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-3">
      {currentTime != null && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Current:</span>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-sm font-medium text-blue-700">
            {currentTime}s
          </span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min="0"
          max={duration || undefined}
          step="0.1"
          placeholder={currentTime != null ? currentTime.toString() : "Time in seconds"}
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-32"
        />
        <span className="text-sm text-muted-foreground">seconds</span>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !time}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
      {duration && (
        <p className="text-xs text-muted-foreground">
          Duration: {formatDuration(duration)} ({duration.toFixed(1)}s)
        </p>
      )}
    </div>
  );
}
