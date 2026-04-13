"use client";

import MuxPlayer from "@mux/mux-player-react";

interface MuxVideoPlayerProps {
  playbackId: string;
  title?: string;
  accentColor?: string;
}

export function MuxVideoPlayer({
  playbackId,
  title,
  accentColor = "#ec4899", // Pink to match Mux branding
}: MuxVideoPlayerProps) {
  if (!playbackId) {
    return (
      <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">No playback ID available</p>
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-lg overflow-hidden">
      <MuxPlayer
        playbackId={playbackId}
        metadata={{
          video_title: title || "Untitled Video",
        }}
        accentColor={accentColor}
        streamType="on-demand"
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}

// Keep TextTrack export for backwards compatibility (no longer needed with Mux Player)
export interface TextTrack {
  src: string;
  label: string;
  language: string;
  kind: "subtitles" | "captions";
  default?: boolean;
}
