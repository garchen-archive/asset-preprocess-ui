// Status type definitions and utilities

export const PROCESSING_STATUSES = {
  imported: "Imported",
  queued: "Queued",
  ingesting: "Ingesting",
  transcoded: "Transcoded",
  ready: "Ready",
  failed: "Failed",
} as const;

export type ProcessingStatus = keyof typeof PROCESSING_STATUSES;

export const PROCESSING_STATUS_OPTIONS = Object.entries(PROCESSING_STATUSES).map(([value, label]) => ({
  value,
  label,
}));

export function getProcessingStatusColor(status: string | null | undefined): string {
  switch (status) {
    case "ready":
      return "bg-green-100 text-green-800";
    case "transcoded":
      return "bg-blue-100 text-blue-800";
    case "ingesting":
    case "queued":
      return "bg-yellow-100 text-yellow-800";
    case "failed":
      return "bg-red-100 text-red-800";
    case "imported":
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getProcessingStatusLabel(status: string | null | undefined): string {
  if (!status) return "Imported";
  return PROCESSING_STATUSES[status as ProcessingStatus] || status;
}

export const CATALOGING_STATUSES = {
  "Not Started": "Not Started",
  "In Progress": "In Progress",
  "Ready": "Ready",
  "Needs Review": "Needs Review",
} as const;

export type CatalogingStatus = keyof typeof CATALOGING_STATUSES;

export const CATALOGING_STATUS_OPTIONS = Object.entries(CATALOGING_STATUSES).map(([value, label]) => ({
  value,
  label,
}));

export const PUBLICATION_STATUSES = {
  draft: "Draft",
  in_review: "In Review",
  approved: "Approved",
  published: "Published",
  needs_work: "Needs Work",
  archived: "Archived",
} as const;

export type PublicationStatus = keyof typeof PUBLICATION_STATUSES;

export const PUBLICATION_STATUS_OPTIONS = Object.entries(PUBLICATION_STATUSES).map(([value, label]) => ({
  value,
  label,
}));

// Color mappings for status badges
export function getCatalogingStatusColor(status: string | null | undefined): string {
  switch (status) {
    case "Ready":
      return "bg-green-100 text-green-800";
    case "In Progress":
      return "bg-yellow-100 text-yellow-800";
    case "Needs Review":
      return "bg-orange-100 text-orange-800";
    case "Not Started":
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getPublicationStatusColor(status: string | null | undefined): string {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";
    case "approved":
      return "bg-blue-100 text-blue-800";
    case "in_review":
      return "bg-yellow-100 text-yellow-800";
    case "needs_work":
      return "bg-orange-100 text-orange-800";
    case "archived":
      return "bg-gray-100 text-gray-600";
    case "draft":
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getPublicationStatusLabel(status: string | null | undefined): string {
  if (!status) return "Draft";
  return PUBLICATION_STATUSES[status as PublicationStatus] || status;
}

export function getCatalogingStatusLabel(status: string | null | undefined): string {
  if (!status) return "Not Started";
  return CATALOGING_STATUSES[status as CatalogingStatus] || status;
}

// Collection status (simpler workflow)
export const COLLECTION_STATUSES = {
  draft: "Draft",
  published: "Published",
  unpublished: "Unpublished",
  archived: "Archived",
} as const;

export type CollectionStatus = keyof typeof COLLECTION_STATUSES;

export const COLLECTION_STATUS_OPTIONS = Object.entries(COLLECTION_STATUSES).map(([value, label]) => ({
  value,
  label,
}));

export function getCollectionStatusColor(status: string | null | undefined): string {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";
    case "unpublished":
      return "bg-yellow-100 text-yellow-800";
    case "archived":
      return "bg-gray-100 text-gray-600";
    case "draft":
    default:
      return "bg-gray-100 text-gray-800";
  }
}

export function getCollectionStatusLabel(status: string | null | undefined): string {
  if (!status) return "Draft";
  return COLLECTION_STATUSES[status as CollectionStatus] || status;
}
