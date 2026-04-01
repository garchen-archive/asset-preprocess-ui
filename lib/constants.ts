// Topic Types (loaded from database, these are fallback defaults)
export const DEFAULT_TOPIC_TYPES = [
  "Deities",
  "Masters",
  "Subjects",
  "Texts",
] as const;

export type TopicTypeName = typeof DEFAULT_TOPIC_TYPES[number];

// Legacy alias for backwards compatibility
export const TOPIC_TYPES = DEFAULT_TOPIC_TYPES;
export type TopicType = TopicTypeName;

// Category Types
export const CATEGORY_TYPES = [
  "Empowerments",
  "General Advice",
  "Mantras",
  "Mudras",
  "Practices",
  "Teachings",
  "Transmissions"
] as const;

export type CategoryType = typeof CATEGORY_TYPES[number];
