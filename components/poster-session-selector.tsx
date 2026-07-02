"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";

interface Session {
  id: string;
  sessionName: string;
  sessionOrder: number | null;
}

const NONE_VALUE = "__none__";

interface PosterSessionSelectorProps {
  eventId: string;
  sessions: Session[];
  currentPosterSessionId?: string | null;
}

export function PosterSessionSelector({
  eventId,
  sessions,
  currentPosterSessionId,
}: PosterSessionSelectorProps) {
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    currentPosterSessionId || NONE_VALUE
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const actualSessionId = selectedSessionId === NONE_VALUE ? null : selectedSessionId;

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/events/${eventId}`,
          method: "PATCH",
          data: {
            poster_session_id: actualSessionId,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        const errorMessage = result.message || result.data?.message || result.data?.error || `HTTP ${result.status}`;
        throw new Error(errorMessage);
      }

      const sessionName = sessions.find((s) => s.id === actualSessionId)?.sessionName;
      toast({
        title: "Poster session updated",
        description: actualSessionId
          ? `"${sessionName}" is now the poster session`
          : "Poster session cleared",
      });

      router.refresh();
    } catch (error) {
      toast({
        title: "Failed to update poster session",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const hasChanged = actualSessionId !== (currentPosterSessionId || null);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a session..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE_VALUE}>None</SelectItem>
            {sessions.map((session) => (
              <SelectItem key={session.id} value={session.id}>
                {session.sessionOrder ? `${session.sessionOrder}. ` : ""}
                {session.sessionName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          size="sm"
          onClick={handleSave}
          disabled={isLoading || !hasChanged}
        >
          {isLoading ? "Saving..." : "Save"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        The poster session&apos;s thumbnail will be used as the event&apos;s cover image.
      </p>
    </div>
  );
}
