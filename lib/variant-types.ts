// Variant type display labels and utilities

export const VARIANT_TYPES = {
  source: "Source",
  edited: "Edited",
  camera_angle: "Camera Angle",
  audio: "Audio Only",
  backup: "Backup",
  alternate: "Alternate",
} as const;

export type VariantType = keyof typeof VARIANT_TYPES;

// Default variant type for new session-asset links
export const DEFAULT_VARIANT_TYPE: VariantType = "source";
export const DEFAULT_VARIANT_LABEL = VARIANT_TYPES[DEFAULT_VARIANT_TYPE];

export function getVariantLabel(variantType: string | null | undefined): string {
  if (!variantType) return "";
  return VARIANT_TYPES[variantType as VariantType] || variantType;
}

export const VARIANT_TYPE_OPTIONS = Object.entries(VARIANT_TYPES).map(([value, label]) => ({
  value,
  label,
}));
