"use client";

import { useState } from "react";
import { AssetsTable } from "./assets-table";
import { BulkAssignModal } from "./bulk-assign-modal";
import { BulkEditModal } from "./bulk-edit-modal";
import { Button } from "./ui/button";

type Asset = {
  id: string;
  name: string | null;
  filepath: string | null;
  title: string | null;
  assetType: string | null;
  catalogingStatus: string | null;
  metadataSource: string | null;
  duration: string | null;
  fileSizeMb: number | null;
  category: string | null;
  hasOralTranslation: boolean | null;
  interpreterName: string | null;
  gdriveUrl: string | null;
  youtubeLink: string | null;
  resolution: string | null;
  videoCodec: string | null;
  audioCodec: string | null;
  videoCodecDescription: string | null;
  audioCodecDescription: string | null;
  frameRate: string | null;
  audioChannels: string | null;
  fileFormat: string | null;
  bitrate: string | null;
  sampleRate: string | null;
  audioQuality: string | null;
  videoQuality: string | null;
  createdDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
  sourceUpdatedAt: Date | null;
  lastHarvestedAt: Date | null;
};

type Event = {
  id: string;
  eventName: string;
  eventDateStart: string | null;
  eventDateEnd: string | null;
  eventType: string | null;
};

type Session = {
  id: string;
  sessionName: string;
  sessionDate: string | null;
  eventId: string | null;
};

type SessionWithHierarchy = {
  session: Session;
  event: Event | null;
};

type AssetsPageClientProps = {
  assets: Asset[];
  events: Event[];
  sessions: SessionWithHierarchy[];
  offset: number;
  sortBy?: string;
  sortOrder?: string;
  searchParams?: Record<string, string>;
};

export function AssetsPageClient({
  assets,
  events,
  sessions,
  offset,
  sortBy,
  sortOrder,
  searchParams,
}: AssetsPageClientProps) {
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [showBulkAssignModal, setShowBulkAssignModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  const handleBulkAssignSuccess = () => {
    setSelectedAssetIds([]);
    // Refresh the page to show updated data
    window.location.reload();
  };

  return (
    <>
      {/* Bulk Actions Bar */}
      {selectedAssetIds.length > 0 && (
        <div className="sticky top-0 z-10 bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-sm font-medium text-blue-900">
                {selectedAssetIds.length} asset{selectedAssetIds.length !== 1 ? "s" : ""} selected
              </div>
              <button
                onClick={() => setSelectedAssetIds([])}
                className="text-sm text-blue-600 hover:text-blue-800 underline"
              >
                Clear selection
              </button>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowBulkEditModal(true)}
                size="sm"
                variant="outline"
              >
                Edit Fields
              </Button>
              <Button
                onClick={() => setShowBulkAssignModal(true)}
                size="sm"
              >
                Assign to Event/Session
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assets Table */}
      <AssetsTable
        assets={assets}
        offset={offset}
        sortBy={sortBy}
        sortOrder={sortOrder}
        searchParams={searchParams}
        selectedAssetIds={selectedAssetIds}
        onSelectionChange={setSelectedAssetIds}
      />

      {/* Bulk Assign Modal */}
      {showBulkAssignModal && (
        <BulkAssignModal
          selectedAssetIds={selectedAssetIds}
          events={events}
          sessions={sessions}
          onClose={() => setShowBulkAssignModal(false)}
          onSuccess={handleBulkAssignSuccess}
        />
      )}

      {/* Bulk Edit Modal */}
      {showBulkEditModal && (
        <BulkEditModal
          selectedAssetIds={selectedAssetIds}
          onClose={() => setShowBulkEditModal(false)}
          onSuccess={handleBulkAssignSuccess}
        />
      )}
    </>
  );
}
