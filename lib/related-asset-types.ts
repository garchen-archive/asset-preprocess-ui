// Related asset type display labels and utilities

export const RELATED_ASSET_TYPES = {
  ephemera: "Ephemera",
  photo: "Photo",
  document: "Document",
  reference: "Reference",
  slide: "Slide",
  other: "Other",
} as const;

export type RelatedAssetType = keyof typeof RELATED_ASSET_TYPES;

export function getRelatedAssetTypeLabel(relatedType: string | null | undefined): string {
  if (!relatedType) return "";
  return RELATED_ASSET_TYPES[relatedType as RelatedAssetType] || relatedType;
}

export const RELATED_ASSET_TYPE_OPTIONS = Object.entries(RELATED_ASSET_TYPES).map(([value, label]) => ({
  value,
  label,
}));
