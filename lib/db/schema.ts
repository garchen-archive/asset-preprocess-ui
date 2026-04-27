import { pgTable, uuid, text, boolean, integer, real, timestamp, date, time, jsonb } from "drizzle-orm/pg-core";

// ============================================================================
// PROGRAM
// Optional umbrella grouping above events
// ============================================================================

export const program = pgTable("program", {
  id: uuid("id").defaultRandom().primaryKey(),
  programName: text("program_name").notNull(),
  programDateStart: date("program_date_start", { mode: "string" }),
  programDateEnd: date("program_date_end", { mode: "string" }),
  description: text("description"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Program = typeof program.$inferSelect;
export type NewProgram = typeof program.$inferInsert;

// ============================================================================
// ASSET LEGACY VIEW
// Backward-compatible view of normalized asset tables
// Use this for UI queries - it JOINs asset with media_detail, asset_external_ref
// ============================================================================

export const asset = pgTable("asset_legacy", {
  // Primary key and source tracking
  id: uuid("id").defaultRandom().primaryKey(),
  metadataSource: text("metadata_source").notNull(),

  // 1. IDENTITY
  name: text("name"),
  filepath: text("filepath"),
  isMediaFile: boolean("is_media_file"),
  assetType: text("asset_type"),
  assetVersion: text("asset_version"),
  relatedAssetIds: jsonb("related_asset_ids").$type<string[]>(),
  fileSizeBytes: integer("file_size_bytes"),
  fileSizeMb: real("file_size_mb"),
  duration: text("duration"),
  durationSeconds: integer("duration_seconds"),
  language: text("language"),

  // 2. CONTENT
  title: text("title"),
  originalDate: timestamp("original_date"),
  category: text("category"),
  descriptionSummary: text("description_summary"),
  additionalTopics: text("additional_topics"),

  // 3. TRANSLATION
  hasOralTranslation: boolean("has_oral_translation"),
  oralTranslationLanguages: jsonb("oral_translation_languages").$type<string[]>(),
  interpreterName: text("interpreter_name"),
  hasTibetanTranscription: boolean("has_tibetan_transcription"),
  hasWrittenTranslation: boolean("has_written_translation"),
  hasSubtitleFiles: boolean("has_subtitle_files"),

  // TRANSCRIPT FIELDS
  transcriptAvailable: boolean("transcript_available").default(false),
  transcriptTimestamped: text("transcript_timestamped").default("No"), // Yes, No, Partial
  transcriptLanguages: jsonb("transcript_languages").$type<string[]>(), // EN, ZH, Tibetan, German, Vietnamese, French, Spanish, Portuguese, Other
  transcriptLocation: text("transcript_location"),

  // 4. QUALITY/EDITORIAL
  overallQuality: text("overall_quality"),
  audioQuality: text("audio_quality"), // high, medium, low, unusable
  videoQuality: text("video_quality"), // high, medium, low, unusable
  audioQualityIssues: text("audio_quality_issues"),
  videoQualityIssues: text("video_quality_issues"),
  needsEditing: boolean("needs_editing"),
  // Note: teaching segments now stored in additional_metadata as teaching_segments array

  // PROCESSING FIELDS
  processingStatus: text("processing_status").default("imported"), // imported, queued, ingesting, transcoded, failed
  publicationStatus: text("publication_status").notNull().default("draft"), // draft, published, archived
  needsDetailedReview: boolean("needs_detailed_review").default(false),

  // 5. ADMINISTRATIVE
  // Optional reference to event (direct event assignment)
  eventId: uuid("event_id").references(() => event.id, { onDelete: "set null" }),
  // Optional reference to event_session (renamed from session_id)
  eventSessionId: uuid("event_session_id").references(() => eventSession.id, { onDelete: "set null" }),
  catalogingStatus: text("cataloging_status"),
  catalogedBy: text("cataloged_by"),
  catalogingDate: date("cataloging_date", { mode: "string" }),
  exclude: boolean("exclude"),
  backedUpLocally: boolean("backed_up_locally"),
  safeToDeleteFromGdrive: boolean("safe_to_delete_from_gdrive"),
  notes: text("notes"),
  contributorOrg: text("contributor_org"),

  // 6. LINKS
  youtubeLink: text("youtube_link"),
  youtubeId: text("youtube_id"),
  gdriveUrl: text("gdrive_url"),
  gdriveId: text("gdrive_id"),

  // Media provider (generic - supports Mux, Cloudflare, etc.)
  mediaProvider: text("media_provider"), // mux, cloudflare, etc.
  mediaProviderAssetId: text("media_provider_asset_id"), // Provider's asset ID (formerly mux_asset_id)

  // Storage (generic - supports Backblaze, S3, etc.)
  storageUrl: text("storage_url"), // Direct URL to file in storage (Backblaze, S3, etc.)

  // 7. TECHNICAL METADATA
  createdDate: timestamp("created_date"),
  modifiedDate: timestamp("modified_date"),
  resolution: text("resolution"),
  videoCodec: text("video_codec"),
  audioCodec: text("audio_codec"),
  videoCodecDescription: text("video_codec_description"),
  audioCodecDescription: text("audio_codec_description"),
  bitrate: text("bitrate"),
  sampleRate: text("sample_rate"),
  frameRate: text("frame_rate"),
  audioChannels: text("audio_channels"),
  fileFormat: text("file_format"),
  fileKind: text("file_kind"), // Human-readable kind (e.g., "MPEG-4 movie") like macOS Finder
  codec: text("codec"), // Legacy

  // YouTube-specific
  viewCount: integer("view_count"),
  likeCount: integer("like_count"),
  commentCount: integer("comment_count"),
  tags: jsonb("tags").$type<string[]>(),
  categoryId: text("category_id"),
  defaultLanguage: text("default_language"),
  privacyStatus: text("privacy_status"),
  uploadStatus: text("upload_status"),
  thumbnailUrl: text("thumbnail_url"),

  // System metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
  sourceUpdatedAt: timestamp("source_updated_at"),
  lastHarvestedAt: timestamp("last_harvested_at"),
  sheetUpdatedAt: timestamp("sheet_updated_at"),

  // Additional metadata (flexible JSON storage)
  additionalMetadata: jsonb("additional_metadata").$type<Record<string, any>>(),
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  // New classification fields (from asset schema redesign)
  assetCategory: text("asset_category"), // media, subtitle, document, image, data
  parentAssetId: uuid("parent_asset_id"),
  mimeType: text("mime_type"),
});

export type Asset = typeof asset.$inferSelect;
export type NewAsset = typeof asset.$inferInsert;

// Legacy aliases for backwards compatibility during migration
export const archiveAssets = asset;
export type ArchiveAsset = Asset;
export type NewArchiveAsset = NewAsset;

// ============================================================================
// MEDIA DETAIL (video/audio specs)
// Type-specific metadata for video and audio assets
// ============================================================================

export const mediaDetail = pgTable("media_detail", {
  assetId: uuid("asset_id").primaryKey(),

  // Duration
  duration: text("duration"),
  durationSeconds: integer("duration_seconds"),

  // Video specs
  resolution: text("resolution"),
  videoCodec: text("video_codec"),
  videoCodecDescription: text("video_codec_description"),
  frameRate: text("frame_rate"),

  // Audio specs
  audioCodec: text("audio_codec"),
  audioCodecDescription: text("audio_codec_description"),
  sampleRate: text("sample_rate"),
  audioChannels: text("audio_channels"),
  bitrate: text("bitrate"),

  // Quality
  overallQuality: text("overall_quality"),
  audioQuality: text("audio_quality"),
  videoQuality: text("video_quality"),
  audioQualityIssues: text("audio_quality_issues"),
  videoQualityIssues: text("video_quality_issues"),

  // Content
  language: text("language"),
  originalDate: timestamp("original_date"),
  contentCategory: text("content_category"),
  description: text("description"),

  // Platform data
  platformData: jsonb("platform_data").$type<Record<string, any>>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type MediaDetail = typeof mediaDetail.$inferSelect;
export type NewMediaDetail = typeof mediaDetail.$inferInsert;

// ============================================================================
// SUBTITLE DETAIL (SRT/VTT metadata)
// ============================================================================

export const subtitleDetail = pgTable("subtitle_detail", {
  assetId: uuid("asset_id").primaryKey(),

  language: text("language").notNull(),
  format: text("format").notNull(), // srt, vtt, ttml
  lineCount: integer("line_count"),
  wordCount: integer("word_count"),
  encoding: text("encoding").default("utf-8"),
  generatedBy: text("generated_by"), // whisper, manual, hybrid
  reviewedAt: timestamp("reviewed_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type SubtitleDetail = typeof subtitleDetail.$inferSelect;
export type NewSubtitleDetail = typeof subtitleDetail.$inferInsert;

// ============================================================================
// DOCUMENT DETAIL (PDF/DOCX metadata)
// ============================================================================

export const documentDetail = pgTable("document_detail", {
  assetId: uuid("asset_id").primaryKey(),

  language: text("language"),
  pageCount: integer("page_count"),
  wordCount: integer("word_count"),
  author: text("author"),
  documentType: text("document_type"), // transcript, notes, commentary, schedule

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type DocumentDetail = typeof documentDetail.$inferSelect;
export type NewDocumentDetail = typeof documentDetail.$inferInsert;

// ============================================================================
// IMAGE DETAIL (thumbnails, posters)
// ============================================================================

export const imageDetail = pgTable("image_detail", {
  assetId: uuid("asset_id").primaryKey(),

  width: integer("width"),
  height: integer("height"),
  aspectRatio: text("aspect_ratio"),
  colorSpace: text("color_space"),
  imageType: text("image_type"), // thumbnail, poster, screenshot, cover

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type ImageDetail = typeof imageDetail.$inferSelect;
export type NewImageDetail = typeof imageDetail.$inferInsert;

// ============================================================================
// ASSET EXTERNAL REF (provider references)
// Links assets to external providers (gdrive, mux, youtube, backblaze)
// ============================================================================

export const assetExternalRef = pgTable("asset_external_ref", {
  id: uuid("id").defaultRandom().primaryKey(),
  assetId: uuid("asset_id").notNull(),

  // Provider identification
  provider: text("provider").notNull(), // gdrive, mux, youtube, backblaze
  providerCategory: text("provider_category").notNull(), // source, media, publication, storage
  externalId: text("external_id").notNull(),
  secondaryId: text("secondary_id"), // e.g., Mux playback_id

  // Status
  status: text("status").default("active"),
  isPrimary: boolean("is_primary").default(false),

  // URLs
  url: text("url"),
  streamUrl: text("stream_url"),
  downloadUrl: text("download_url"),

  // Versioned metadata
  schemaVersion: text("schema_version").default("1.0"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),

  // Sync tracking
  lastSyncedAt: timestamp("last_synced_at"),
  lastWebhookAt: timestamp("last_webhook_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type AssetExternalRef = typeof assetExternalRef.$inferSelect;
export type NewAssetExternalRef = typeof assetExternalRef.$inferInsert;

// ============================================================================
// EVENT (formerly events)
// Canonical content container
// ============================================================================

export const event = pgTable("event", {
  id: uuid("id").defaultRandom().primaryKey(),
  programId: uuid("program_id").references(() => program.id, { onDelete: "set null" }),
  eventName: text("event_name").notNull(),
  eventDateStart: date("event_date_start", { mode: "string" }),
  eventDateEnd: date("event_date_end", { mode: "string" }),
  eventType: text("event_type"),
  eventFormat: text("event_format"), // single, series, retreat
  parentEventId: uuid("parent_event_id").references((): any => event.id, { onDelete: "set null" }), // Self-referential
  locationId: uuid("location_id").references(() => location.id, { onDelete: "set null" }),
  organizerOrganizationId: uuid("organizer_organization_id").references(() => organization.id, { onDelete: "set null" }),
  hostOrganizationId: uuid("host_organization_id").references(() => organization.id, { onDelete: "set null" }),
  onlineHostOrganizationId: uuid("online_host_organization_id").references(() => organization.id, { onDelete: "set null" }),
  venueId: uuid("venue_id").references(() => venue.id, { onDelete: "set null" }),
  venueAddressId: uuid("venue_address_id").references(() => address.id, { onDelete: "set null" }), // DEPRECATED: Use venueId
  spaceLabel: text("space_label"), // Ad-hoc room detail (e.g., "Main Hall", "Room 201")
  category: text("category"), // Comma-delimited categories
  topic: text("topic"), // Comma-delimited topics
  eventDescription: text("event_description"),
  totalDuration: text("total_duration"),
  catalogingStatus: text("cataloging_status"),
  publicationStatus: text("publication_status").notNull().default("draft"), // draft, in_review, approved, published, needs_work, archived
  notes: text("notes"),
  harvestSource: text("harvest_source"),
  lastHarvestedAt: timestamp("last_harvested_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  createdBy: text("created_by"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),

  // Additional metadata (flexible JSON storage)
  additionalMetadata: jsonb("additional_metadata").$type<Record<string, any>>(),
});

export type Event = typeof event.$inferSelect;
export type NewEvent = typeof event.$inferInsert;

// Legacy alias
export const events = event;

// ============================================================================
// EVENT_SESSION (formerly sessions)
// Logical teaching unit within an event
// ============================================================================

export const eventSession = pgTable("event_session", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => event.id, { onDelete: "cascade" }),
  canonicalEventSessionAssetId: uuid("canonical_event_session_asset_id"), // FK added after eventSessionAsset is defined
  sessionName: text("session_name").notNull(),
  sessionDate: date("session_date", { mode: "string" }),
  sessionTime: text("session_time"), // Time of day: morning, afternoon, evening, night
  sessionStartTime: time("session_start_time"),
  sessionEndTime: time("session_end_time"),
  // Note: sequenceInEvent removed - ordering belongs to collection_item
  topic: text("topic"),
  category: text("category"),
  sessionDescription: text("session_description"),
  venueId: uuid("venue_id").references(() => venue.id, { onDelete: "set null" }), // Optional override of event's venue
  spaceLabel: text("space_label"), // Ad-hoc room detail (session-level override)
  durationEstimated: text("duration_estimated"),
  assetCount: integer("asset_count").default(0),
  hasAssets: boolean("has_assets").default(false),
  catalogingStatus: text("cataloging_status"),
  publicationStatus: text("publication_status").notNull().default("draft"), // draft, in_review, approved, published, needs_work, archived
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),

  // Additional metadata (flexible JSON storage)
  additionalMetadata: jsonb("additional_metadata").$type<Record<string, any>>(),
});

export type EventSession = typeof eventSession.$inferSelect;
export type NewEventSession = typeof eventSession.$inferInsert;

// Legacy aliases
export const sessions = eventSession;
export type Session = EventSession;
export type NewSession = NewEventSession;

// ============================================================================
// EVENT_SESSION_ASSET
// Media variants for sessions (camera angles, masters, backups, etc.)
// ============================================================================

export const eventSessionAsset = pgTable("event_session_asset", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventSessionId: uuid("event_session_id").notNull().references(() => eventSession.id, { onDelete: "cascade" }),
  assetId: uuid("asset_id").notNull().references(() => asset.id, { onDelete: "cascade" }),
  variantType: text("variant_type").notNull(), // camera_angle, master, backup, audio_only, edited, other
  variantLabel: text("variant_label"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EventSessionAsset = typeof eventSessionAsset.$inferSelect;
export type NewEventSessionAsset = typeof eventSessionAsset.$inferInsert;

// ============================================================================
// AUTH TABLES (keep plural - standard convention)
// ============================================================================

// Users table - compatible with NextAuth and OAuth providers (Auth0, Google, etc.)
export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique(), // Email used for OAuth providers
  emailVerified: timestamp("email_verified"),
  image: text("image"), // Profile image from OAuth providers
  role: text("role").notNull().default("editor"), // admin, editor, viewer
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Accounts table - for OAuth providers (Auth0, Google, GitHub, etc.)
export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // oauth, email, credentials
  provider: text("provider").notNull(), // auth0, google, github, credentials
  providerAccountId: text("provider_account_id").notNull(), // ID from the provider
  refresh_token: text("refresh_token"),
  access_token: text("access_token"),
  expires_at: integer("expires_at"),
  token_type: text("token_type"),
  scope: text("scope"),
  id_token: text("id_token"),
  session_state: text("session_state"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

// Credentials table - for local username/password authentication
export const credentials = pgTable("credentials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(), // bcrypt hash
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;

// ============================================================================
// TOPIC_TYPE
// Classification types for topics (Deities, Masters, Subjects, Texts)
// ============================================================================

export const topicType = pgTable("topic_type", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type TopicType = typeof topicType.$inferSelect;
export type NewTopicType = typeof topicType.$inferInsert;

// ============================================================================
// TOPIC (formerly topics)
// ============================================================================

export const topic = pgTable("topic", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Topic = typeof topic.$inferSelect;
export type NewTopic = typeof topic.$inferInsert;

// Legacy alias
export const topics = topic;

// ============================================================================
// TOPIC_CLASSIFICATION
// Junction table for topic to topic_type (many-to-many)
// ============================================================================

export const topicClassification = pgTable("topic_classification", {
  topicId: uuid("topic_id").notNull().references(() => topic.id, { onDelete: "cascade" }),
  topicTypeId: uuid("topic_type_id").notNull().references(() => topicType.id, { onDelete: "cascade" }),
});

export type TopicClassification = typeof topicClassification.$inferSelect;
export type NewTopicClassification = typeof topicClassification.$inferInsert;

// ============================================================================
// CATEGORY (formerly categories)
// ============================================================================

export const category = pgTable("category", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // Deities, Practices, Core Teachings, Texts, Historical Figures
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Category = typeof category.$inferSelect;
export type NewCategory = typeof category.$inferInsert;

// Legacy alias
export const categories = category;

// ============================================================================
// JUNCTION TABLES
// ============================================================================

// Event Topic junction table
export const eventTopic = pgTable("event_topic", {
  eventId: uuid("event_id").notNull().references(() => event.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topic.id, { onDelete: "cascade" }),
});

export type EventTopic = typeof eventTopic.$inferSelect;
export type NewEventTopic = typeof eventTopic.$inferInsert;

// Legacy alias
export const eventTopics = eventTopic;

// Event Category junction table
export const eventCategory = pgTable("event_category", {
  eventId: uuid("event_id").notNull().references(() => event.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => category.id, { onDelete: "cascade" }),
});

export type EventCategory = typeof eventCategory.$inferSelect;
export type NewEventCategory = typeof eventCategory.$inferInsert;

// Legacy alias
export const eventCategories = eventCategory;

// Event Session Topic junction table (formerly session_topics)
export const eventSessionTopic = pgTable("event_session_topic", {
  eventSessionId: uuid("event_session_id").notNull().references(() => eventSession.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topic.id, { onDelete: "cascade" }),
});

export type EventSessionTopic = typeof eventSessionTopic.$inferSelect;
export type NewEventSessionTopic = typeof eventSessionTopic.$inferInsert;

// Legacy aliases
export const sessionTopics = eventSessionTopic;
export type SessionTopic = EventSessionTopic;
export type NewSessionTopic = NewEventSessionTopic;

// Event Session Category junction table (formerly session_categories)
export const eventSessionCategory = pgTable("event_session_category", {
  eventSessionId: uuid("event_session_id").notNull().references(() => eventSession.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => category.id, { onDelete: "cascade" }),
});

export type EventSessionCategory = typeof eventSessionCategory.$inferSelect;
export type NewEventSessionCategory = typeof eventSessionCategory.$inferInsert;

// Legacy aliases
export const sessionCategories = eventSessionCategory;
export type SessionCategory = EventSessionCategory;
export type NewSessionCategory = NewEventSessionCategory;

// ============================================================================
// ORGANIZATION (formerly organizations)
// Legal or administrative entities (organizers, hosts, sponsors)
// ============================================================================

export const organization = pgTable("organization", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  alternativeNames: text("alternative_names").array(),
  orgType: text("org_type"),
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;

// Legacy alias
export const organizations = organization;

// ============================================================================
// LOCATION (formerly locations)
// Stable site where events occur (campus, retreat land, online platform)
// ============================================================================

export const location = pgTable("location", {
  id: uuid("id").defaultRandom().primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  alternativeNames: text("alternative_names").array(),
  locationType: text("location_type"), // center, campus, retreat_site, hotel, online
  isOnline: boolean("is_online").default(false),
  timezone: text("timezone"), // e.g., 'America/Phoenix', 'Asia/Taipei'
  description: text("description"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Location = typeof location.$inferSelect;
export type NewLocation = typeof location.$inferInsert;

// Legacy alias
export const locations = location;

// ============================================================================
// ADDRESS (formerly addresses)
// ============================================================================

export const address = pgTable("address", {
  id: uuid("id").defaultRandom().primaryKey(),
  label: text("label"),
  city: text("city"),
  stateProvince: text("state_province"),
  country: text("country"),
  postalCode: text("postal_code"),
  fullAddress: text("full_address"),
  latitude: real("latitude"),
  longitude: real("longitude"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Address = typeof address.$inferSelect;
export type NewAddress = typeof address.$inferInsert;

// Legacy alias
export const addresses = address;

// ============================================================================
// LOCATION_ADDRESS (formerly location_addresses)
// Junction table linking locations to addresses
// ============================================================================

export const locationAddress = pgTable("location_address", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull().references(() => location.id, { onDelete: "cascade" }),
  addressId: uuid("address_id").notNull().references(() => address.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").notNull().default(false),
  effectiveFrom: date("effective_from", { mode: "string" }),
  effectiveTo: date("effective_to", { mode: "string" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type LocationAddress = typeof locationAddress.$inferSelect;
export type NewLocationAddress = typeof locationAddress.$inferInsert;

// Legacy alias
export const locationAddresses = locationAddress;

// ============================================================================
// ORGANIZATION_LOCATION (formerly organization_locations)
// Junction table linking organizations to locations
// ============================================================================

export const organizationLocation = pgTable("organization_location", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organization.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => location.id, { onDelete: "cascade" }),
  role: text("role"), // HQ, branch, temporary
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OrganizationLocation = typeof organizationLocation.$inferSelect;
export type NewOrganizationLocation = typeof organizationLocation.$inferInsert;

// Legacy alias
export const organizationLocations = organizationLocation;

// ============================================================================
// VENUE (formerly venues)
// Event-ready place: Location + Address + optional space label
// ============================================================================

export const venue = pgTable("venue", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull().references(() => location.id, { onDelete: "cascade" }),
  addressId: uuid("address_id").references(() => address.id, { onDelete: "set null" }), // Optional (null for online)
  spaceLabel: text("space_label"), // e.g., "Main Hall", "Room 201"
  name: text("name"), // Optional override name
  venueType: text("venue_type"), // hall, auditorium, outdoor, online_room
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Venue = typeof venue.$inferSelect;
export type NewVenue = typeof venue.$inferInsert;

// Legacy alias
export const venues = venue;

// ============================================================================
// TRANSCRIPT (formerly transcripts)
// Structured transcript metadata and workflow
// ============================================================================

export const transcript = pgTable("transcript", {
  id: uuid("id").defaultRandom().primaryKey(),

  // Session-level references (new)
  eventSessionId: uuid("event_session_id").references(() => eventSession.id, { onDelete: "cascade" }),
  eventSessionAssetId: uuid("event_session_asset_id").references(() => eventSessionAsset.id, { onDelete: "set null" }),

  // Asset-level references
  // mediaAssetId: Only set when timing is aligned to a specific file variant (e.g., ASR from Camera A)
  mediaAssetId: uuid("media_asset_id").references(() => asset.id, { onDelete: "set null" }),
  // canonicalAssetId: The transcript file (SRT, VTT, document)
  canonicalAssetId: uuid("canonical_asset_id").references(() => asset.id, { onDelete: "set null" }),

  // Language & Type
  language: text("language").notNull(),                      // bo, en, zh, es, de, vi, fr, pt, multi
  kind: text("kind").notNull().default("transcript"),        // transcript, translation
  spokenSource: text("spoken_source"),                       // teacher, interpreter, mixed, unknown
  spokenLanguage: text("spoken_language"),                   // bo, en, multi, unknown
  translationOf: text("translation_of"),                     // teacher, interpreter, mixed, unknown (when kind=translation)

  // Timecode & Source
  timecodeStatus: text("timecode_status").default("none"),   // none, partial, full
  source: text("source"),                                    // asr, human, hybrid

  // Workflow (legacy)
  publicationStatus: text("publication_status").notNull().default("draft"), // draft, in_review, approved, published, needs_work, archived
  version: integer("version").notNull().default(1),

  // V2 Workflow (stage-based editorial workflow)
  stage: text("stage").notNull().default("editor_review"), // transcription, translation, editor_review, eic_review, approved, synced
  stageStatus: text("stage_status").notNull().default("pending"), // pending, in_progress, revision_requested
  assignedTo: uuid("assigned_to"), // User currently assigned
  assignedAt: timestamp("assigned_at"),

  // Subtitle provider (for syncing to video platforms)
  subtitleProvider: text("subtitle_provider"), // mux, etc.
  subtitleTrackId: text("subtitle_track_id"),
  subtitleUrl: text("subtitle_url"),
  syncedAt: timestamp("synced_at"),

  // Visibility and approval
  isVisible: boolean("is_visible").notNull().default(false),
  approvedBy: uuid("approved_by"),
  approvedAt: timestamp("approved_at"),
  revisionNotes: text("revision_notes"),

  // Content
  content: text("content"), // Transcript text content (may include SRT format)

  // Attribution
  createdBy: text("created_by"),
  editedBy: text("edited_by"),

  // System
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Transcript = typeof transcript.$inferSelect;
export type NewTranscript = typeof transcript.$inferInsert;

// Legacy alias
export const transcripts = transcript;

// ============================================================================
// TRANSCRIPT_REVISION (formerly transcript_revisions)
// Immutable revision history for Transcript records
// ============================================================================

export const transcriptRevision = pgTable("transcript_revision", {
  id: uuid("id").defaultRandom().primaryKey(),

  // References
  transcriptId: uuid("transcript_id").notNull().references(() => transcript.id, { onDelete: "cascade" }),
  canonicalAssetId: uuid("canonical_asset_id").references(() => asset.id, { onDelete: "set null" }),

  // Version tracking
  versionNumber: integer("version_number").notNull(),

  // Attribution
  editedBy: text("edited_by"),
  editedAt: timestamp("edited_at").defaultNow().notNull(),

  // Context
  changeNote: text("change_note"),
  statusSnapshot: text("status_snapshot"),                   // workflow status at time of revision

  // System (append-only, no updatedAt)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type TranscriptRevision = typeof transcriptRevision.$inferSelect;
export type NewTranscriptRevision = typeof transcriptRevision.$inferInsert;

// Legacy alias
export const transcriptRevisions = transcriptRevision;

// ============================================================================
// COLLECTION
// Presentation playlists (event-scoped, user-created, or editorial)
// ============================================================================

export const collection = pgTable("collection", {
  id: uuid("id").defaultRandom().primaryKey(),
  scope: text("scope").notNull(), // event, user, editorial
  eventId: uuid("event_id").references(() => event.id, { onDelete: "cascade" }),
  ownerId: uuid("owner_id"), // For user-created playlists
  name: text("name").notNull(),
  description: text("description"),
  isDefault: boolean("is_default").notNull().default(false),
  visibility: text("visibility").notNull().default("private"), // private, shared, public
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Collection = typeof collection.$inferSelect;
export type NewCollection = typeof collection.$inferInsert;

// ============================================================================
// COLLECTION_ITEM
// Ordered presentation entries within a collection
// References exactly one of: event_session, event_session_asset, or asset
// ============================================================================

export const collectionItem = pgTable("collection_item", {
  id: uuid("id").defaultRandom().primaryKey(),
  collectionId: uuid("collection_id").notNull().references(() => collection.id, { onDelete: "cascade" }),

  // Exactly one of these must be set
  eventSessionId: uuid("event_session_id").references(() => eventSession.id, { onDelete: "set null" }),
  eventSessionAssetId: uuid("event_session_asset_id").references(() => eventSessionAsset.id, { onDelete: "set null" }),
  assetId: uuid("asset_id").references(() => asset.id, { onDelete: "set null" }),

  // Ordering & Display
  sequence: integer("sequence").notNull(),
  label: text("label"),
  occurrenceDate: date("occurrence_date", { mode: "string" }),
  dayLabel: text("day_label"),
  isContinuation: boolean("is_continuation").notNull().default(false),
  relationshipType: text("relationship_type").notNull(), // session, session_variant, supplemental, reference

  // System
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type CollectionItem = typeof collectionItem.$inferSelect;
export type NewCollectionItem = typeof collectionItem.$inferInsert;

// ============================================================================
// RELATED_ASSET
// Supplemental materials attached to any entity (polymorphic)
// ============================================================================

export const relatedAsset = pgTable("related_asset", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerType: text("owner_type").notNull(), // program, event, event_session, transcript
  ownerId: uuid("owner_id").notNull(),
  assetId: uuid("asset_id").notNull().references(() => asset.id, { onDelete: "cascade" }),
  label: text("label"),
  relatedType: text("related_type"), // ephemera, photo, document, reference, slide, other
  sequence: integer("sequence"),
  metadata: jsonb("metadata").$type<Record<string, any>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export type RelatedAsset = typeof relatedAsset.$inferSelect;
export type NewRelatedAsset = typeof relatedAsset.$inferInsert;
