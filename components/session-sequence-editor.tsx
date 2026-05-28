"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { moveSessionInSequence, normalizeEventSequences } from "@/lib/actions";

interface Session {
  id: string;
  sessionName: string;
  sequence: number | null;
}

interface SessionSequenceEditorProps {
  sessions: Session[];
  eventId: string;
}

export function SessionSequenceEditor({ sessions, eventId }: SessionSequenceEditorProps) {
  const [isMoving, setIsMoving] = useState<string | null>(null);
  const [isNormalizing, setIsNormalizing] = useState(false);

  const handleMove = async (sessionId: string, direction: "up" | "down") => {
    setIsMoving(sessionId);
    try {
      const result = await moveSessionInSequence(sessionId, direction);
      if (result.error) {
        console.error(result.error);
      }
    } finally {
      setIsMoving(null);
    }
  };

  const handleNormalize = async () => {
    setIsNormalizing(true);
    try {
      const result = await normalizeEventSequences(eventId);
      if (result.error) {
        console.error(result.error);
      }
    } finally {
      setIsNormalizing(false);
    }
  };

  // Check if any session is missing a sequence
  const hasUnsequenced = sessions.some((s) => s.sequence === null);

  return (
    <div className="space-y-2">
      {hasUnsequenced && (
        <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-2">
          <span>Some sessions have no sequence.</span>
          <Button
            size="sm"
            variant="outline"
            onClick={handleNormalize}
            disabled={isNormalizing}
            className="text-xs"
          >
            {isNormalizing ? "Assigning..." : "Auto-assign sequences"}
          </Button>
        </div>
      )}
    </div>
  );
}

interface SessionRowActionsProps {
  sessionId: string;
  isFirst: boolean;
  isLast: boolean;
}

export function SessionRowActions({ sessionId, isFirst, isLast }: SessionRowActionsProps) {
  const [isMoving, setIsMoving] = useState(false);

  const handleMove = async (direction: "up" | "down") => {
    setIsMoving(true);
    try {
      await moveSessionInSequence(sessionId, direction);
    } finally {
      setIsMoving(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        onClick={() => handleMove("up")}
        disabled={isFirst || isMoving}
        title="Move up"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      </Button>
      <Button
        size="sm"
        variant="ghost"
        className="h-6 w-6 p-0"
        onClick={() => handleMove("down")}
        disabled={isLast || isMoving}
        title="Move down"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </Button>
    </div>
  );
}
