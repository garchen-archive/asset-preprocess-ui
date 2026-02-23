import { pgTable, uuid, text, boolean, integer, real, timestamp, date, time, jsonb } from "drizzle-orm/pg-core";

export const archiveAssets = pgTable("archive_assets", {
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
  processingStatus: text("processing_status").default("Raw"), // Raw, Ready_for_MVP, Needs_Work, In_Progress, Complete, Published
  needsDetailedReview: boolean("needs_detailed_review").default(false),

  // 5. ADMINISTRATIVE
  // Optional reference to event (direct event assignment)
  // Mutually exclusive with sessionId - asset must have EITHER eventId OR sessionId
  eventId: uuid("event_id").references(() => events.id, { onDelete: "set null" }),
  // Optional reference to session
  // Mutually exclusive with eventId - asset must have EITHER eventId OR sessionId
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "set null" }),
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
  muxAssetId: text("mux_asset_id"),

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
});

export type ArchiveAsset = typeof archiveAssets.$inferSelect;
export type NewArchiveAsset = typeof archiveAssets.$inferInsert;

// Events table
export const events = pgTable("events", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventName: text("event_name").notNull(),
  eventDateStart: date("event_date_start", { mode: "string" }),
  eventDateEnd: date("event_date_end", { mode: "string" }),
  eventType: text("event_type"),
  eventFormat: text("event_format"), // single_recording, series, retreat, collection
  parentEventId: uuid("parent_event_id").references((): any => events.id, { onDelete: "set null" }), // Self-referential
  locationId: uuid("location_id").references(() => locations.id, { onDelete: "set null" }),
  organizerOrganizationId: uuid("organizer_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  hostOrganizationId: uuid("host_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  onlineHostOrganizationId: uuid("online_host_organization_id").references(() => organizations.id, { onDelete: "set null" }),
  venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }),
  venueAddressId: uuid("venue_address_id").references(() => addresses.id, { onDelete: "set null" }), // DEPRECATED: Use venueId
  spaceLabel: text("space_label"), // Ad-hoc room detail (e.g., "Main Hall", "Room 201")
  category: text("category"), // Comma-delimited categories
  topic: text("topic"), // Comma-delimited topics
  eventDescription: text("event_description"),
  totalDuration: text("total_duration"),
  catalogingStatus: text("cataloging_status"),
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

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;

// Sessions table (series layer removed - sessions now directly reference events)
export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  eventId: uuid("event_id").references(() => events.id, { onDelete: "cascade" }), // Changed from series_id to event_id
  sessionName: text("session_name").notNull(),
  sessionDate: date("session_date", { mode: "string" }),
  sessionTime: text("session_time"), // Time of day: morning, afternoon, evening, night
  sessionStartTime: time("session_start_time"),
  sessionEndTime: time("session_end_time"),
  sequenceInEvent: integer("sequence_in_event"),
  topic: text("topic"), // Renamed from primary_topic
  category: text("category"),
  sessionDescription: text("session_description"),
  venueId: uuid("venue_id").references(() => venues.id, { onDelete: "set null" }), // Optional override of event's venue
  spaceLabel: text("space_label"), // Ad-hoc room detail (session-level override)
  durationEstimated: text("duration_estimated"),
  assetCount: integer("asset_count").default(0),
  hasAssets: boolean("has_assets").default(false),
  catalogingStatus: text("cataloging_status"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),

  // Additional metadata (flexible JSON storage)
  additionalMetadata: jsonb("additional_metadata").$type<Record<string, any>>(),
});

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;

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
// Separate from users table for security and flexibility
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

// Topics table
export const topics = pgTable("topics", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // Deities, Practices, Core Teachings, Texts, Historical Figures
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Topic = typeof topics.$inferSelect;
export type NewTopic = typeof topics.$inferInsert;

// Categories table
export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull().unique(),
  type: text("type").notNull(), // Deities, Practices, Core Teachings, Texts, Historical Figures
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

// Event Topics junction table (many-to-many)
export const eventTopics = pgTable("event_topics", {
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
});

export type EventTopic = typeof eventTopics.$inferSelect;
export type NewEventTopic = typeof eventTopics.$inferInsert;

// Event Categories junction table (many-to-many)
export const eventCategories = pgTable("event_categories", {
  eventId: uuid("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
});

export type EventCategory = typeof eventCategories.$inferSelect;
export type NewEventCategory = typeof eventCategories.$inferInsert;

// Session Topics junction table (many-to-many)
export const sessionTopics = pgTable("session_topics", {
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  topicId: uuid("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
});

export type SessionTopic = typeof sessionTopics.$inferSelect;
export type NewSessionTopic = typeof sessionTopics.$inferInsert;

// Session Categories junction table (many-to-many)
export const sessionCategories = pgTable("session_categories", {
  sessionId: uuid("session_id").notNull().references(() => sessions.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
});

export type SessionCategory = typeof sessionCategories.$inferSelect;
export type NewSessionCategory = typeof sessionCategories.$inferInsert;

// ============================================================================
// ORGANIZATIONS (renamed from locations)
// Legal or administrative entities (organizers, hosts, sponsors)
// ============================================================================

export const organizations = pgTable("organizations", {
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

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;

// ============================================================================
// LOCATIONS (site identity)
// Stable site where events occur (campus, retreat land, online platform)
// ============================================================================

export const locations = pgTable("locations", {
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

export type Location = typeof locations.$inferSelect;
export type NewLocation = typeof locations.$inferInsert;

// ============================================================================
// ADDRESSES (independent entity)
// ============================================================================

export const addresses = pgTable("addresses", {
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

export type Address = typeof addresses.$inferSelect;
export type NewAddress = typeof addresses.$inferInsert;

// ============================================================================
// LOCATION_ADDRESSES (junction table)
// ============================================================================

export const locationAddresses = pgTable("location_addresses", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  addressId: uuid("address_id").notNull().references(() => addresses.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").notNull().default(false),
  effectiveFrom: date("effective_from", { mode: "string" }),
  effectiveTo: date("effective_to", { mode: "string" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type LocationAddress = typeof locationAddresses.$inferSelect;
export type NewLocationAddress = typeof locationAddresses.$inferInsert;

// ============================================================================
// ORGANIZATION_LOCATIONS (junction table)
// Links organizations to their locations with role and primary designation
// ============================================================================

export const organizationLocations = pgTable("organization_locations", {
  id: uuid("id").defaultRandom().primaryKey(),
  organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "cascade" }),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  role: text("role"), // HQ, branch, temporary (not surfaced in UI yet)
  isPrimary: boolean("is_primary").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type OrganizationLocation = typeof organizationLocations.$inferSelect;
export type NewOrganizationLocation = typeof organizationLocations.$inferInsert;

// ============================================================================
// VENUES
// Event-ready place: Location + Address + optional space label
// ============================================================================

export const venues = pgTable("venues", {
  id: uuid("id").defaultRandom().primaryKey(),
  locationId: uuid("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  addressId: uuid("address_id").references(() => addresses.id, { onDelete: "set null" }), // Optional (null for online)
  spaceLabel: text("space_label"), // e.g., "Main Hall", "Room 201"
  name: text("name"), // Optional override name
  venueType: text("venue_type"), // hall, auditorium, outdoor, online_room
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  deletedAt: timestamp("deleted_at"),
});

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
