// Related asset type display labels and utilities
// These types must match the pipeline's determineRelatedType() in cmssync/prep.go

export const RELATED_ASSET_TYPES = {
  audio: "Audio",
  video: "Video",
  image: "Image",
  pdf: "PDF",
  document: "Document",
  slide: "Slide",
  reference: "Reference",
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
