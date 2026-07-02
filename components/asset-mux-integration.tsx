"use client";

import { useRouter } from "next/navigation";
import { MuxSyncWidget } from "./mux-sync-widget";
import { TranscriptList } from "./transcript-list";

interface TranscriptData {
  id: string;
  language: string;
  kind: string;
  spokenSource?: string | null;
  publicationStatus: string;
  stage: string;
  timecodeStatus?: string | null;
  source?: string | null;
  version: number;
  subtitleTrackId?: string | null;
  syncedAt?: string | null;
  canonicalAssetName?: string | null;
}

interface AssetMuxIntegrationProps {
  assetId: string;
  assetType?: string | null;
  mediaProvider?: string | null;
  mediaProviderAssetId?: string | null;
  playbackId?: string | null;
  status?: string | null;
  duration?: number | null;
  aspectRatio?: string | null;
  muxDashboardUrl?: string | null;
  transcripts: TranscriptData[];
  showVideoPlayer?: boolean;
  videoPlayerComponent?: React.ReactNode;
  thumbnailComponent?: React.ReactNode;
  // For linking transcripts to a session when creating from asset page
  eventSessionId?: string | null;
}

export function AssetMuxIntegration({
  assetId,
  assetType,
  mediaProvider,
  mediaProviderAssetId,
  playbackId,
  status,
  duration,
  aspectRatio,
  muxDashboardUrl,
  transcripts,
  showVideoPlayer = false,
  videoPlayerComponent,
  thumbnailComponent,
  eventSessionId,
}: AssetMuxIntegrationProps) {
  const router = useRouter();

  const handleSyncComplete = () => {
    // Refresh the page to get updated data
    router.refresh();
  };

  const isMuxSynced = mediaProvider === "mux" && !!mediaProviderAssetId;

  return (
    <div className="space-y-6">
      {/* Video Player (if synced and ready) */}
      {showVideoPlayer && videoPlayerComponent}

      {/* Mux Sync Status */}
      <MuxSyncWidget
        assetId={assetId}
        mediaProvider={mediaProvider}
        mediaProviderAssetId={mediaProviderAssetId}
        playbackId={playbackId}
        status={status}
        duration={duration}
        aspectRatio={aspectRatio}
        muxDashboardUrl={muxDashboardUrl}
        onSyncComplete={handleSyncComplete}
      />

      {/* Thumbnail Settings */}
      {thumbnailComponent}

      {/* Transcripts with Sync */}
      <TranscriptList
        scope="asset"
        mediaAssetId={assetId}
        assetType={assetType}
        transcripts={transcripts}
        isMuxSynced={isMuxSynced}
        onRefresh={handleSyncComplete}
        eventSessionId={eventSessionId}
      />
    </div>
  );
}
