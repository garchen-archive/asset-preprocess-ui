"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import {
  CATALOGING_STATUS_OPTIONS,
  PUBLICATION_STATUS_OPTIONS,
  PROCESSING_STATUS_OPTIONS,
  COLLECTION_STATUS_OPTIONS,
  getCatalogingStatusColor,
  getPublicationStatusColor,
  getProcessingStatusColor,
  getCollectionStatusColor,
  getCatalogingStatusLabel,
  getPublicationStatusLabel,
  getProcessingStatusLabel,
  getCollectionStatusLabel,
} from "@/lib/status-types";

type EntityType = "event" | "session" | "asset" | "transcript" | "collection";
type StatusField = "cataloging_status" | "publication_status" | "processing_status" | "status";

interface StatusBadgeProps {
  entityType: EntityType;
  entityId: string;
  statusField: StatusField;
  currentValue: string | null;
  editable?: boolean;
}

const ENTITY_ENDPOINTS: Record<EntityType, string> = {
  event: "/api/v1/admin/events",
  session: "/api/v1/admin/sessions",
  asset: "/api/v1/admin/assets",
  transcript: "/api/v1/admin/transcripts",
  collection: "/api/v1/admin/collections",
};

const ENTITY_METHODS: Record<EntityType, string> = {
  event: "PATCH",
  session: "PATCH",
  asset: "PATCH",
  transcript: "PATCH",
  collection: "PATCH",
};

export function StatusBadge({
  entityType,
  entityId,
  statusField,
  currentValue,
  editable = true,
}: StatusBadgeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const isCataloging = statusField === "cataloging_status";
  const isProcessing = statusField === "processing_status";
  const isCollection = entityType === "collection" && statusField === "status";

  const options = isCataloging
    ? CATALOGING_STATUS_OPTIONS
    : isProcessing
    ? PROCESSING_STATUS_OPTIONS
    : isCollection
    ? COLLECTION_STATUS_OPTIONS
    : PUBLICATION_STATUS_OPTIONS;
  const getColor = isCataloging
    ? getCatalogingStatusColor
    : isProcessing
    ? getProcessingStatusColor
    : isCollection
    ? getCollectionStatusColor
    : getPublicationStatusColor;
  const getLabel = isCataloging
    ? getCatalogingStatusLabel
    : isProcessing
    ? getProcessingStatusLabel
    : isCollection
    ? getCollectionStatusLabel
    : getPublicationStatusLabel;

  const handleChange = async (newValue: string) => {
    if (newValue === currentValue) {
      setIsEditing(false);
      return;
    }

    setIsUpdating(true);
    try {
      // Collection uses publication_status field in API
      const apiField = isCollection ? "publication_status" : statusField;

      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `${ENTITY_ENDPOINTS[entityType]}/${entityId}`,
          method: ENTITY_METHODS[entityType],
          data: {
            [apiField]: newValue,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: "Status updated",
        description: `${isCataloging ? "Cataloging" : isProcessing ? "Processing" : isCollection ? "Collection" : "Publication"} status changed to "${getLabel(newValue)}".`,
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update status",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  if (!editable) {
    return (
      <Badge className={`${getColor(currentValue)} text-xs`}>
        {getLabel(currentValue)}
      </Badge>
    );
  }

  if (isEditing) {
    return (
      <select
        value={currentValue || (isCataloging ? "Not Started" : isProcessing ? "imported" : "draft")}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={() => setIsEditing(false)}
        disabled={isUpdating}
        autoFocus
        className="text-xs border rounded px-1 py-0.5 bg-background"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="hover:opacity-80 transition-opacity"
      title="Click to change status"
    >
      <Badge className={`${getColor(currentValue)} text-xs cursor-pointer`}>
        {getLabel(currentValue)}
      </Badge>
    </button>
  );
}
