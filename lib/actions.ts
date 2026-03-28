"use server";

import { db } from "@/lib/db/client";
import { archiveAssets, events, sessions, topics, categories, eventTopics, eventCategories, sessionTopics, sessionCategories, locations, addresses, locationAddresses, organizations, organizationLocations, venues, transcripts, transcriptRevisions } from "@/lib/db/schema";
import { eq, sql, inArray, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { dateCertaintyToMeta, type DateCertainty } from "@/lib/utils";

function parseCoord(value: string | null): number | null {
  if (!value) return null;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export async function updateAsset(id: string, formData: FormData) {
  // Parse additional metadata JSON
  let additionalMetadata = null;
  const additionalMetadataStr = formData.get("additionalMetadata") as string;
  if (additionalMetadataStr && additionalMetadataStr.trim()) {
    try {
      additionalMetadata = JSON.parse(additionalMetadataStr);
    } catch (e) {
      // If JSON is invalid, ignore it
      console.error("Invalid JSON in additionalMetadata:", e);
    }
  }

  // Parse transcript languages (multiple checkboxes)
  const transcriptLanguages = formData.getAll("transcriptLanguages") as string[];

  const data = {
    title: formData.get("title") as string || null,
    category: formData.get("category") as string || null,
    descriptionSummary: formData.get("descriptionSummary") as string || null,
    additionalTopics: formData.get("additionalTopics") as string || null,

    // Translation
    hasOralTranslation: formData.get("hasOralTranslation") === "on",
    interpreterName: formData.get("interpreterName") as string || null,
    hasTibetanTranscription: formData.get("hasTibetanTranscription") === "on",
    hasWrittenTranslation: formData.get("hasWrittenTranslation") === "on",
    hasSubtitleFiles: formData.get("hasSubtitleFiles") === "on",

    // Transcript
    transcriptAvailable: formData.get("transcriptAvailable") === "on",
    transcriptTimestamped: formData.get("transcriptTimestamped") as string || "No",
    transcriptLanguages: transcriptLanguages.length > 0 ? transcriptLanguages : null,
    transcriptLocation: formData.get("transcriptLocation") as string || null,

    // Processing
    processingStatus: formData.get("processingStatus") as string || "raw",
    publicationStatus: formData.get("publicationStatus") as string || "draft",
    needsDetailedReview: formData.get("needsDetailedReview") === "on",

    // Quality
    audioQuality: formData.get("audioQuality") as string || null,
    videoQuality: formData.get("videoQuality") as string || null,
    audioQualityIssues: formData.get("audioQualityIssues") as string || null,
    videoQualityIssues: formData.get("videoQualityIssues") as string || null,
    needsEditing: formData.get("needsEditing") === "on",

    // Administrative - Event or Session assignment (mutually exclusive)
    eventId: formData.get("eventId") as string || null,
    eventSessionId: formData.get("eventSessionId") as string || null,
    catalogingStatus: formData.get("catalogingStatus") as string || null,
    catalogedBy: formData.get("catalogedBy") as string || null,
    backedUpLocally: formData.get("backedUpLocally") === "on",
    safeToDeleteFromGdrive: formData.get("safeToDeleteFromGdrive") === "on",
    exclude: formData.get("exclude") === "on",
    contributorOrg: formData.get("contributorOrg") as string || null,
    notes: formData.get("notes") as string || null,

    // Additional metadata
    additionalMetadata,

    updatedAt: new Date(),
  };

  await db
    .update(archiveAssets)
    .set(data)
    .where(eq(archiveAssets.id, id));

  revalidatePath(`/assets/${id}`);
  redirect(`/assets/${id}`);
}

export async function deleteAsset(id: string) {
  await db
    .delete(archiveAssets)
    .where(eq(archiveAssets.id, id));

  revalidatePath("/assets");
}

// ============================================================================
// EVENT ACTIONS
// ============================================================================

export async function createEvent(prevState: { error: string } | undefined, formData: FormData) {
  const parentEventIdStr = formData.get("parentEventId") as string;
  const hostOrganizationIdStr = formData.get("hostOrganizationId") as string;
  const organizerOrganizationIdStr = formData.get("organizerOrganizationId") as string;
  const onlineHostOrganizationIdStr = formData.get("onlineHostOrganizationId") as string;
  const venueIdStr = formData.get("venueId") as string;

  // Extract topic and category IDs from form data
  const topicIds = formData.getAll("topicIds") as string[];
  const categoryIds = formData.getAll("categoryIds") as string[];

  // Extract date certainty from form and convert to precision + qualifier
  const startCertainty = (formData.get("startCertainty") as DateCertainty) || "exact";
  const endCertainty = (formData.get("endCertainty") as DateCertainty) || "exact";

  const startMeta = dateCertaintyToMeta(startCertainty);
  const endMeta = dateCertaintyToMeta(endCertainty);

  // Only store non-default values in dateMeta
  const dateMeta: Record<string, string> = {};
  if (startMeta.precision !== "day") {
    dateMeta.startPrecision = startMeta.precision;
  }
  if (endMeta.precision !== "day") {
    dateMeta.endPrecision = endMeta.precision;
  }
  // Use start qualifier as the primary (they should usually match)
  if (startMeta.qualifier !== "exact") {
    dateMeta.qualifier = startMeta.qualifier;
  }

  // Parse custom metadata from form (sent as JSON string)
  const customMetadataStr = formData.get("customMetadata") as string;
  let customMetadata: Record<string, unknown> | undefined;
  if (customMetadataStr) {
    try {
      const parsed = JSON.parse(customMetadataStr);
      if (typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
        customMetadata = parsed;
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  // Build additionalMetadata with dateMeta and custom if present
  const additionalMetadata: Record<string, unknown> = {};
  if (Object.keys(dateMeta).length > 0) {
    additionalMetadata.dateMeta = dateMeta;
  }
  if (customMetadata) {
    additionalMetadata.custom = customMetadata;
  }
  const finalMetadata = Object.keys(additionalMetadata).length > 0 ? additionalMetadata : null;

  const data = {
    eventName: formData.get("eventName") as string,
    parentEventId: parentEventIdStr && parentEventIdStr !== "" ? parentEventIdStr : null,
    hostOrganizationId: hostOrganizationIdStr && hostOrganizationIdStr !== "" ? hostOrganizationIdStr : null,
    organizerOrganizationId: organizerOrganizationIdStr && organizerOrganizationIdStr !== "" ? organizerOrganizationIdStr : null,
    onlineHostOrganizationId: onlineHostOrganizationIdStr && onlineHostOrganizationIdStr !== "" ? onlineHostOrganizationIdStr : null,
    venueId: venueIdStr && venueIdStr !== "" ? venueIdStr : null,
    spaceLabel: formData.get("spaceLabel") as string || null,
    eventDateStart: formData.get("eventDateStart") as string || null,
    eventDateEnd: formData.get("eventDateEnd") as string || null,
    eventType: formData.get("eventType") as string || null,
    eventFormat: formData.get("eventFormat") as string || null,
    eventDescription: formData.get("eventDescription") as string || null,
    catalogingStatus: formData.get("catalogingStatus") as string || null,
    notes: formData.get("notes") as string || null,
    createdBy: formData.get("createdBy") as string || null,
    additionalMetadata: finalMetadata,
  };

  try {
    const [newEvent] = await db.insert(events).values(data).returning();

    // Create junction table entries for topics
    if (topicIds.length > 0) {
      await db.insert(eventTopics).values(
        topicIds.map(topicId => ({
          eventId: newEvent.id,
          topicId: topicId,
        }))
      );
    }

    // Create junction table entries for categories
    if (categoryIds.length > 0) {
      await db.insert(eventCategories).values(
        categoryIds.map(categoryId => ({
          eventId: newEvent.id,
          categoryId: categoryId,
        }))
      );
    }

    revalidatePath("/events");
    redirect(`/events/${newEvent.id}`);
  } catch (error: any) {
    // Re-throw redirect errors (these are not actual errors)
    if (error?.message === 'NEXT_REDIRECT' || error?.digest?.startsWith('NEXT_REDIRECT')) {
      throw error;
    }

    // Log the full error to help debug
    console.error('Create event error:', error);

    // Check for unique constraint violation
    if (error?.code === '23505') {
      return { error: 'A duplicate value was found. Please check your input.' };
    }
    return { error: `An unexpected error occurred: ${error?.message || 'Please try again.'}` };
  }
}

export async function updateEvent(id: string, formData: FormData) {
  // Get existing event to preserve additionalMetadata
  const [existingEvent] = await db
    .select({ additionalMetadata: events.additionalMetadata })
    .from(events)
    .where(eq(events.id, id))
    .limit(1);

  // Build additionalMetadata by merging existing with new dateMeta
  const existingMetadata = (existingEvent?.additionalMetadata as Record<string, unknown>) || {};

  // Extract date certainty from form and convert to precision + qualifier
  const startCertainty = (formData.get("startCertainty") as DateCertainty) || "exact";
  const endCertainty = (formData.get("endCertainty") as DateCertainty) || "exact";

  const startMeta = dateCertaintyToMeta(startCertainty);
  const endMeta = dateCertaintyToMeta(endCertainty);

  // Only store non-default values in dateMeta
  const dateMeta: Record<string, string> = {};
  if (startMeta.precision !== "day") {
    dateMeta.startPrecision = startMeta.precision;
  }
  if (endMeta.precision !== "day") {
    dateMeta.endPrecision = endMeta.precision;
  }
  // Use start qualifier as the primary (they should usually match)
  if (startMeta.qualifier !== "exact") {
    dateMeta.qualifier = startMeta.qualifier;
  }

  // Parse custom metadata from form (sent as JSON string)
  const customMetadataStr = formData.get("customMetadata") as string;
  let customMetadata: Record<string, unknown> | undefined;
  if (customMetadataStr) {
    try {
      const parsed = JSON.parse(customMetadataStr);
      if (typeof parsed === "object" && !Array.isArray(parsed) && Object.keys(parsed).length > 0) {
        customMetadata = parsed;
      }
    } catch {
      // Ignore invalid JSON
    }
  }

  // Merge dateMeta and custom into existing metadata (preserve sheetImport)
  const additionalMetadata: Record<string, unknown> = {
    ...existingMetadata,
    dateMeta: Object.keys(dateMeta).length > 0 ? dateMeta : undefined,
    custom: customMetadata,
  };

  // Clean up: remove empty keys
  if (!additionalMetadata.dateMeta) {
    delete additionalMetadata.dateMeta;
  }
  if (!additionalMetadata.custom) {
    delete additionalMetadata.custom;
  }

  const parentEventIdStr = formData.get("parentEventId") as string;
  const hostOrganizationIdStr = formData.get("hostOrganizationId") as string;
  const organizerOrganizationIdStr = formData.get("organizerOrganizationId") as string;
  const onlineHostOrganizationIdStr = formData.get("onlineHostOrganizationId") as string;
  const venueIdStr = formData.get("venueId") as string;

  // Extract topic and category IDs from form data
  const topicIds = formData.getAll("topicIds") as string[];
  const categoryIds = formData.getAll("categoryIds") as string[];

  const data = {
    eventName: formData.get("eventName") as string,
    parentEventId: parentEventIdStr && parentEventIdStr !== "" ? parentEventIdStr : null,
    hostOrganizationId: hostOrganizationIdStr && hostOrganizationIdStr !== "" ? hostOrganizationIdStr : null,
    organizerOrganizationId: organizerOrganizationIdStr && organizerOrganizationIdStr !== "" ? organizerOrganizationIdStr : null,
    onlineHostOrganizationId: onlineHostOrganizationIdStr && onlineHostOrganizationIdStr !== "" ? onlineHostOrganizationIdStr : null,
    venueId: venueIdStr && venueIdStr !== "" ? venueIdStr : null,
    spaceLabel: formData.get("spaceLabel") as string || null,
    eventDateStart: formData.get("eventDateStart") as string || null,
    eventDateEnd: formData.get("eventDateEnd") as string || null,
    eventType: formData.get("eventType") as string || null,
    eventFormat: formData.get("eventFormat") as string || null,
    eventDescription: formData.get("eventDescription") as string || null,
    catalogingStatus: formData.get("catalogingStatus") as string || null,
    notes: formData.get("notes") as string || null,
    additionalMetadata: Object.keys(additionalMetadata).length > 0 ? additionalMetadata : null,
    updatedAt: new Date(),
  };

  await db.update(events).set(data).where(eq(events.id, id));

  // Delete existing junction table entries
  await db.delete(eventTopics).where(eq(eventTopics.eventId, id));
  await db.delete(eventCategories).where(eq(eventCategories.eventId, id));

  // Create new junction table entries for topics
  if (topicIds.length > 0) {
    await db.insert(eventTopics).values(
      topicIds.map(topicId => ({
        eventId: id,
        topicId: topicId,
      }))
    );
  }

  // Create new junction table entries for categories
  if (categoryIds.length > 0) {
    await db.insert(eventCategories).values(
      categoryIds.map(categoryId => ({
        eventId: id,
        categoryId: categoryId,
      }))
    );
  }

  revalidatePath(`/events/${id}`);
  redirect(`/events/${id}`);
}

export async function deleteEvent(id: string) {
  await db.delete(events).where(eq(events.id, id));

  revalidatePath("/events");
  redirect("/events");
}

export async function assignEventAsChild(eventId: string, parentEventId: string) {
  await db
    .update(events)
    .set({ parentEventId: parentEventId })
    .where(eq(events.id, eventId));

  revalidatePath(`/events/${parentEventId}`);
  redirect(`/events/${parentEventId}`);
}

// ============================================================================
// SESSION ACTIONS
// ============================================================================

export async function createSession(formData: FormData) {
  // Extract topic and category IDs from form data
  const topicIds = formData.getAll("topicIds") as string[];
  const categoryIds = formData.getAll("categoryIds") as string[];

  const data = {
    eventId: formData.get("eventId") as string || null,
    sessionName: formData.get("sessionName") as string,
    sessionDate: formData.get("sessionDate") as string || null,
    sessionTime: formData.get("sessionTime") as string || null,
    sessionStartTime: formData.get("sessionStartTime") as string || null,
    sessionEndTime: formData.get("sessionEndTime") as string || null,
    sessionDescription: formData.get("sessionDescription") as string || null,
    durationEstimated: formData.get("durationEstimated") as string || null,
    catalogingStatus: formData.get("catalogingStatus") as string || null,
    notes: formData.get("notes") as string || null,
  };

  const [newSession] = await db.insert(sessions).values(data).returning();

  // Create junction table entries for topics
  if (topicIds.length > 0) {
    await db.insert(sessionTopics).values(
      topicIds.map(topicId => ({
        eventSessionId: newSession.id,
        topicId: topicId,
      }))
    );
  }

  // Create junction table entries for categories
  if (categoryIds.length > 0) {
    await db.insert(sessionCategories).values(
      categoryIds.map(categoryId => ({
        eventSessionId: newSession.id,
        categoryId: categoryId,
      }))
    );
  }

  revalidatePath("/sessions");
  redirect(`/sessions/${newSession.id}`);
}

export async function updateSession(id: string, formData: FormData) {
  // Parse additional metadata JSON
  let additionalMetadata = null;
  const additionalMetadataStr = formData.get("additionalMetadata") as string;
  if (additionalMetadataStr && additionalMetadataStr.trim()) {
    try {
      additionalMetadata = JSON.parse(additionalMetadataStr);
    } catch (e) {
      console.error("Invalid JSON in additionalMetadata:", e);
    }
  }

  // Extract topic and category IDs from form data
  const topicIds = formData.getAll("topicIds") as string[];
  const categoryIds = formData.getAll("categoryIds") as string[];

  const data = {
    eventId: formData.get("eventId") as string || null,
    sessionName: formData.get("sessionName") as string,
    sessionDate: formData.get("sessionDate") as string || null,
    sessionTime: formData.get("sessionTime") as string || null,
    sessionStartTime: formData.get("sessionStartTime") as string || null,
    sessionEndTime: formData.get("sessionEndTime") as string || null,
    sessionDescription: formData.get("sessionDescription") as string || null,
    durationEstimated: formData.get("durationEstimated") as string || null,
    catalogingStatus: formData.get("catalogingStatus") as string || null,
    notes: formData.get("notes") as string || null,
    additionalMetadata,
    updatedAt: new Date(),
  };

  await db.update(sessions).set(data).where(eq(sessions.id, id));

  // Delete existing junction table entries
  await db.delete(sessionTopics).where(eq(sessionTopics.eventSessionId, id));
  await db.delete(sessionCategories).where(eq(sessionCategories.eventSessionId, id));

  // Create new junction table entries for topics
  if (topicIds.length > 0) {
    await db.insert(sessionTopics).values(
      topicIds.map(topicId => ({
        eventSessionId: id,
        topicId: topicId,
      }))
    );
  }

  // Create new junction table entries for categories
  if (categoryIds.length > 0) {
    await db.insert(sessionCategories).values(
      categoryIds.map(categoryId => ({
        eventSessionId: id,
        categoryId: categoryId,
      }))
    );
  }

  revalidatePath(`/sessions/${id}`);
  redirect(`/sessions/${id}`);
}

export async function deleteSession(id: string) {
  await db.delete(sessions).where(eq(sessions.id, id));

  revalidatePath("/sessions");
  redirect("/sessions");
}

interface BulkSessionData {
  eventId: string;
  sessionName: string;
  sessionDate: string | null;
  topic: string | null;
  category: string | null;
}

export async function bulkCreateSessions(
  sessionsData: BulkSessionData[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    if (!sessionsData || sessionsData.length === 0) {
      return { success: false, error: "No sessions to create" };
    }

    const eventId = sessionsData[0].eventId;

    // Insert all sessions
    const insertData = sessionsData.map(s => ({
      eventId: s.eventId,
      sessionName: s.sessionName,
      sessionDate: s.sessionDate,
      topic: s.topic,
      category: s.category,
    }));

    await db.insert(sessions).values(insertData);

    revalidatePath(`/events/${eventId}`);
    revalidatePath("/sessions");

    return { success: true, count: sessionsData.length };
  } catch (error) {
    console.error("Failed to bulk create sessions:", error);
    return { success: false, error: "Failed to create sessions" };
  }
}

// ============================================================================
// TOPICS AND CATEGORIES ACTIONS
// ============================================================================

export async function createTopic(name: string, type: string) {
  const [topic] = await db
    .insert(topics)
    .values({ name: name.trim(), type })
    .returning();

  revalidatePath("/events");
  revalidatePath("/sessions");
  return topic;
}

export async function createCategory(name: string, type: string) {
  const [category] = await db
    .insert(categories)
    .values({ name: name.trim(), type })
    .returning();

  revalidatePath("/events");
  revalidatePath("/sessions");
  return category;
}

// ============================================================================
// LOCATION ACTIONS
// ============================================================================

export async function createLocation(formData: FormData) {
  const alternativeNamesStr = formData.get("alternativeNames") as string;
  const alternativeNames = alternativeNamesStr
    ? alternativeNamesStr.split(",").map(n => n.trim()).filter(Boolean)
    : null;

  const isOnline = formData.get("isOnline") === "on";

  const data = {
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    alternativeNames,
    locationType: formData.get("locationType") as string || null,
    isOnline,
    description: formData.get("description") as string || null,
    notes: formData.get("notes") as string || null,
  };

  const [newLocation] = await db.insert(locations).values(data).returning();

  // Auto-create a default venue for online locations (no address needed)
  if (isOnline) {
    await db.insert(venues).values({
      locationId: newLocation.id,
      addressId: null,
      spaceLabel: null,
      venueType: "online",
    });
  }

  revalidatePath("/locations");
  redirect(`/locations/${newLocation.id}`);
}

export async function updateLocation(id: string, formData: FormData) {
  const alternativeNamesStr = formData.get("alternativeNames") as string;
  const alternativeNames = alternativeNamesStr
    ? alternativeNamesStr.split(",").map(n => n.trim()).filter(Boolean)
    : null;

  const isOnline = formData.get("isOnline") === "on";

  const data = {
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    alternativeNames,
    locationType: formData.get("locationType") as string || null,
    isOnline,
    description: formData.get("description") as string || null,
    notes: formData.get("notes") as string || null,
    updatedAt: new Date(),
  };

  await db.update(locations).set(data).where(eq(locations.id, id));

  // If changed to online, ensure a venue exists
  if (isOnline) {
    const existingVenues = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.locationId, id))
      .limit(1);

    if (existingVenues.length === 0) {
      await db.insert(venues).values({
        locationId: id,
        addressId: null,
        spaceLabel: null,
        venueType: "online",
      });
    }
  }

  revalidatePath(`/locations/${id}`);
  redirect(`/locations/${id}`);
}

// Update location and its primary address in one action
export async function updateLocationWithAddress(id: string, formData: FormData) {
  const alternativeNamesStr = formData.get("alternativeNames") as string;
  const alternativeNames = alternativeNamesStr
    ? alternativeNamesStr.split(",").map(n => n.trim()).filter(Boolean)
    : null;

  const isOnline = formData.get("isOnline") === "on";

  // Location data
  const locationData = {
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    alternativeNames,
    locationType: formData.get("locationType") as string || null,
    timezone: formData.get("timezone") as string || null,
    isOnline,
    description: formData.get("description") as string || null,
    notes: formData.get("notes") as string || null,
    updatedAt: new Date(),
  };

  // Update location
  await db.update(locations).set(locationData).where(eq(locations.id, id));

  // Update primary address if provided
  const primaryAddressId = formData.get("primaryAddressId") as string;
  if (primaryAddressId) {
    const addressData = {
      label: formData.get("primaryLabel") as string || null,
      fullAddress: formData.get("primaryFullAddress") as string || null,
      city: formData.get("primaryCity") as string || null,
      stateProvince: formData.get("primaryStateProvince") as string || null,
      country: formData.get("primaryCountry") as string || null,
      postalCode: formData.get("primaryPostalCode") as string || null,
      updatedAt: new Date(),
    };

    await db.update(addresses).set(addressData).where(eq(addresses.id, primaryAddressId));
  }

  // Auto-create/update venue if needed
  const existingVenues = await db
    .select({ id: venues.id, addressId: venues.addressId })
    .from(venues)
    .where(eq(venues.locationId, id));

  if (existingVenues.length === 0) {
    // No venue exists - create one
    if (isOnline) {
      await db.insert(venues).values({
        locationId: id,
        addressId: null,
        spaceLabel: null,
        venueType: "online",
      });
    } else if (primaryAddressId) {
      await db.insert(venues).values({
        locationId: id,
        addressId: primaryAddressId,
        spaceLabel: null,
        venueType: "in_person",
      });
    }
  } else if (primaryAddressId) {
    // Update venue without address to use the primary address
    const venueWithoutAddress = existingVenues.find(v => !v.addressId);
    if (venueWithoutAddress) {
      await db
        .update(venues)
        .set({ addressId: primaryAddressId, updatedAt: new Date() })
        .where(eq(venues.id, venueWithoutAddress.id));
    }
  }

  revalidatePath(`/locations/${id}`);
  redirect(`/locations/${id}`);
}

export async function deleteLocation(id: string) {
  await db.delete(locations).where(eq(locations.id, id));

  revalidatePath("/locations");
  redirect("/locations");
}

// ============================================================================
// ORGANIZATION ACTIONS
// ============================================================================

export async function createOrganization(formData: FormData) {
  const alternativeNamesStr = formData.get("alternativeNames") as string;
  const alternativeNames = alternativeNamesStr
    ? alternativeNamesStr.split(",").map(n => n.trim()).filter(Boolean)
    : null;

  const data = {
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    alternativeNames,
    orgType: formData.get("orgType") as string || null,
    description: formData.get("description") as string || null,
    notes: formData.get("notes") as string || null,
  };

  const [newOrg] = await db.insert(organizations).values(data).returning();

  revalidatePath("/organizations");
  redirect(`/organizations/${newOrg.id}`);
}

export async function updateOrganization(id: string, formData: FormData) {
  const alternativeNamesStr = formData.get("alternativeNames") as string;
  const alternativeNames = alternativeNamesStr
    ? alternativeNamesStr.split(",").map(n => n.trim()).filter(Boolean)
    : null;

  const data = {
    code: formData.get("code") as string,
    name: formData.get("name") as string,
    alternativeNames,
    orgType: formData.get("orgType") as string || null,
    description: formData.get("description") as string || null,
    notes: formData.get("notes") as string || null,
    updatedAt: new Date(),
  };

  await db.update(organizations).set(data).where(eq(organizations.id, id));

  revalidatePath(`/organizations/${id}`);
  redirect(`/organizations/${id}`);
}

export async function deleteOrganization(id: string) {
  await db.delete(organizations).where(eq(organizations.id, id));

  revalidatePath("/organizations");
  redirect("/organizations");
}

// ============================================================================
// ADDRESS ACTIONS (independent entity)
// ============================================================================

export async function createAddress(formData: FormData) {
  const data = {
    label: formData.get("label") as string || null,
    city: formData.get("city") as string || null,
    stateProvince: formData.get("stateProvince") as string || null,
    country: formData.get("country") as string || null,
    postalCode: formData.get("postalCode") as string || null,
    fullAddress: formData.get("fullAddress") as string || null,
    latitude: parseCoord(formData.get("latitude") as string),
    longitude: parseCoord(formData.get("longitude") as string),
    notes: formData.get("notes") as string || null,
  };

  const [newAddress] = await db.insert(addresses).values(data).returning();

  revalidatePath("/addresses");
  redirect(`/addresses/${newAddress.id}`);
}

export async function updateAddress(id: string, formData: FormData) {
  const data = {
    label: formData.get("label") as string || null,
    city: formData.get("city") as string || null,
    stateProvince: formData.get("stateProvince") as string || null,
    country: formData.get("country") as string || null,
    postalCode: formData.get("postalCode") as string || null,
    fullAddress: formData.get("fullAddress") as string || null,
    latitude: parseCoord(formData.get("latitude") as string),
    longitude: parseCoord(formData.get("longitude") as string),
    notes: formData.get("notes") as string || null,
    updatedAt: new Date(),
  };

  await db.update(addresses).set(data).where(eq(addresses.id, id));

  revalidatePath(`/addresses/${id}`);
  redirect(`/addresses/${id}`);
}

export async function deleteAddress(id: string) {
  await db.delete(addresses).where(eq(addresses.id, id));

  revalidatePath("/addresses");
  redirect("/addresses");
}

// ============================================================================
// LOCATION-ADDRESS LINK ACTIONS (junction table)
// ============================================================================

export async function createAddressAndLinkToLocation(locationId: string, formData: FormData) {
  const isPrimary = formData.get("isPrimary") === "on";

  // Create the address
  const [newAddress] = await db.insert(addresses).values({
    label: formData.get("label") as string || null,
    city: formData.get("city") as string || null,
    stateProvince: formData.get("stateProvince") as string || null,
    country: formData.get("country") as string || null,
    postalCode: formData.get("postalCode") as string || null,
    fullAddress: formData.get("fullAddress") as string || null,
    latitude: parseCoord(formData.get("latitude") as string),
    longitude: parseCoord(formData.get("longitude") as string),
    notes: formData.get("notes") as string || null,
  }).returning();

  // If setting as primary, unset existing primary for this location
  if (isPrimary) {
    await db
      .update(locationAddresses)
      .set({ isPrimary: false })
      .where(eq(locationAddresses.locationId, locationId));
  }

  // Link to location
  await db.insert(locationAddresses).values({
    locationId,
    addressId: newAddress.id,
    isPrimary,
    effectiveFrom: formData.get("effectiveFrom") as string || null,
    effectiveTo: formData.get("effectiveTo") as string || null,
  });

  // Auto-create default venue if this is primary address and no venue exists yet
  if (isPrimary) {
    const existingVenues = await db
      .select({ id: venues.id })
      .from(venues)
      .where(eq(venues.locationId, locationId))
      .limit(1);

    if (existingVenues.length === 0) {
      // No venue exists - create a default one with this address
      await db.insert(venues).values({
        locationId,
        addressId: newAddress.id,
        spaceLabel: null,
        venueType: "in_person",
      });
    }
  }

  revalidatePath(`/locations/${locationId}`);
  redirect(`/locations/${locationId}`);
}

export async function setLocationAddressPrimary(linkId: string, locationId: string) {
  // Get the address ID from the link
  const [link] = await db
    .select({ addressId: locationAddresses.addressId })
    .from(locationAddresses)
    .where(eq(locationAddresses.id, linkId))
    .limit(1);

  if (!link) {
    throw new Error("Location address link not found");
  }

  // Unset existing primary for this location
  await db
    .update(locationAddresses)
    .set({ isPrimary: false })
    .where(eq(locationAddresses.locationId, locationId));

  // Set the new primary
  await db
    .update(locationAddresses)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(eq(locationAddresses.id, linkId));

  // Check if there's a venue without an address that should use this new primary
  const existingVenues = await db
    .select({ id: venues.id, addressId: venues.addressId })
    .from(venues)
    .where(eq(venues.locationId, locationId));

  if (existingVenues.length === 0) {
    // No venue exists - create one with this address
    await db.insert(venues).values({
      locationId,
      addressId: link.addressId,
      spaceLabel: null,
      venueType: "in_person",
    });
  } else {
    // Check if there's a venue with no address - update it
    const venueWithoutAddress = existingVenues.find(v => !v.addressId);
    if (venueWithoutAddress) {
      await db
        .update(venues)
        .set({ addressId: link.addressId, updatedAt: new Date() })
        .where(eq(venues.id, venueWithoutAddress.id));
    }
  }

  revalidatePath(`/locations/${locationId}`);
  redirect(`/locations/${locationId}`);
}

export async function linkAddressToLocation(locationId: string, formData: FormData) {
  const addressId = formData.get("addressId") as string;
  const isPrimary = formData.get("isPrimary") === "on";

  // If setting as primary, unset existing primary for this location
  if (isPrimary) {
    await db
      .update(locationAddresses)
      .set({ isPrimary: false })
      .where(eq(locationAddresses.locationId, locationId));
  }

  await db.insert(locationAddresses).values({
    locationId,
    addressId,
    isPrimary,
    effectiveFrom: formData.get("effectiveFrom") as string || null,
    effectiveTo: formData.get("effectiveTo") as string || null,
  });

  revalidatePath(`/locations/${locationId}`);
  redirect(`/locations/${locationId}`);
}

export async function unlinkAddressFromLocation(linkId: string, locationId: string) {
  await db.delete(locationAddresses).where(eq(locationAddresses.id, linkId));

  revalidatePath(`/locations/${locationId}`);
  redirect(`/locations/${locationId}`);
}

export async function updateLocationAddressLink(linkId: string, locationId: string, formData: FormData) {
  const isPrimary = formData.get("isPrimary") === "on";

  // If setting as primary, unset existing primary for this location
  if (isPrimary) {
    await db
      .update(locationAddresses)
      .set({ isPrimary: false })
      .where(eq(locationAddresses.locationId, locationId));
  }

  await db.update(locationAddresses).set({
    isPrimary,
    effectiveFrom: formData.get("effectiveFrom") as string || null,
    effectiveTo: formData.get("effectiveTo") as string || null,
    updatedAt: new Date(),
  }).where(eq(locationAddresses.id, linkId));

  // Auto-create/update venue if setting as primary
  if (isPrimary) {
    // Get the address ID from this link
    const [link] = await db
      .select({ addressId: locationAddresses.addressId })
      .from(locationAddresses)
      .where(eq(locationAddresses.id, linkId))
      .limit(1);

    if (link) {
      const existingVenues = await db
        .select({ id: venues.id, addressId: venues.addressId })
        .from(venues)
        .where(eq(venues.locationId, locationId));

      if (existingVenues.length === 0) {
        // No venue exists - create one
        await db.insert(venues).values({
          locationId,
          addressId: link.addressId,
          spaceLabel: null,
          venueType: "in_person",
        });
      } else {
        // Update venue without address to use this one
        const venueWithoutAddress = existingVenues.find(v => !v.addressId);
        if (venueWithoutAddress) {
          await db
            .update(venues)
            .set({ addressId: link.addressId, updatedAt: new Date() })
            .where(eq(venues.id, venueWithoutAddress.id));
        }
      }
    }
  }

  revalidatePath(`/locations/${locationId}`);
  redirect(`/locations/${locationId}`);
}

export async function updateAddressAndLink(addressId: string, linkId: string, locationId: string, formData: FormData) {
  const isPrimary = formData.get("isPrimary") === "on";

  // Update the address itself
  const addressData = {
    label: formData.get("label") as string || null,
    city: formData.get("city") as string || null,
    stateProvince: formData.get("stateProvince") as string || null,
    country: formData.get("country") as string || null,
    postalCode: formData.get("postalCode") as string || null,
    fullAddress: formData.get("fullAddress") as string || null,
    latitude: parseCoord(formData.get("latitude") as string),
    longitude: parseCoord(formData.get("longitude") as string),
    notes: formData.get("notes") as string || null,
    updatedAt: new Date(),
  };

  await db.update(addresses).set(addressData).where(eq(addresses.id, addressId));

  // If setting as primary, unset existing primary for this location
  if (isPrimary) {
    await db
      .update(locationAddresses)
      .set({ isPrimary: false })
      .where(eq(locationAddresses.locationId, locationId));
  }

  // Update the link record
  await db.update(locationAddresses).set({
    isPrimary,
    effectiveFrom: formData.get("effectiveFrom") as string || null,
    effectiveTo: formData.get("effectiveTo") as string || null,
    updatedAt: new Date(),
  }).where(eq(locationAddresses.id, linkId));

  // Auto-create/update venue if setting as primary
  if (isPrimary) {
    const existingVenues = await db
      .select({ id: venues.id, addressId: venues.addressId })
      .from(venues)
      .where(eq(venues.locationId, locationId));

    if (existingVenues.length === 0) {
      // No venue exists - create one
      await db.insert(venues).values({
        locationId,
        addressId,
        spaceLabel: null,
        venueType: "in_person",
      });
    } else {
      // Update venue without address to use this one
      const venueWithoutAddress = existingVenues.find(v => !v.addressId);
      if (venueWithoutAddress) {
        await db
          .update(venues)
          .set({ addressId, updatedAt: new Date() })
          .where(eq(venues.id, venueWithoutAddress.id));
      }
    }
  }

  revalidatePath(`/locations/${locationId}`);
  revalidatePath(`/addresses/${addressId}`);
  redirect(`/locations/${locationId}`);
}

// ============================================================================
// BULK ASSET ASSIGNMENT
// ============================================================================

export async function bulkAssignAssets({
  assetIds,
  eventId,
  eventSessionId,
}: {
  assetIds: string[];
  eventId: string | null;
  eventSessionId: string | null;
}) {
  try {
    // Validate that we have either eventId or eventSessionId, but not both
    if ((eventId && eventSessionId) || (!eventId && !eventSessionId)) {
      return { success: false, error: "Must specify either event or session, but not both" };
    }

    // Update all selected assets
    await db
      .update(archiveAssets)
      .set({
        eventId: eventId || null,
        eventSessionId: eventSessionId || null,
        updatedAt: new Date(),
      })
      .where(inArray(archiveAssets.id, assetIds));

    revalidatePath("/assets");
    return { success: true };
  } catch (error: any) {
    console.error("Bulk assign error:", error);
    return { success: false, error: error.message || "Failed to assign assets" };
  }
}

// Bulk update multiple fields on assets
export async function bulkUpdateAssets({
  assetIds,
  updates,
}: {
  assetIds: string[];
  updates: {
    hasOralTranslation?: boolean | null;
    oralTranslationLanguages?: string[] | null;
    interpreterName?: string | null;
    contributorOrg?: string | null;
    processingStatus?: string | null;
    needsDetailedReview?: boolean | null;
    transcriptAvailable?: boolean | null;
    transcriptTimestamped?: string | null;
    transcriptLanguages?: string[] | null;
    catalogingStatus?: string | null;
    exclude?: boolean | null;
    safeToDeleteFromGdrive?: boolean | null;
    backedUpLocally?: boolean | null;
    audioQuality?: string | null;
    videoQuality?: string | null;
    assetType?: string | null;
  };
}) {
  try {
    if (!assetIds || assetIds.length === 0) {
      return { success: false, error: "No assets selected" };
    }

    // Filter out undefined values - only update fields that were explicitly set
    const updateData: Record<string, any> = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    // If no fields to update besides updatedAt, return early
    if (Object.keys(updateData).length <= 1) {
      return { success: false, error: "No fields to update" };
    }

    await db
      .update(archiveAssets)
      .set(updateData)
      .where(inArray(archiveAssets.id, assetIds));

    revalidatePath("/assets");
    return { success: true, updatedCount: assetIds.length };
  } catch (error: any) {
    console.error("Bulk update error:", error);
    return { success: false, error: error.message || "Failed to update assets" };
  }
}

// ============================================================================
// BULK EVENT UPDATE
// ============================================================================

export async function bulkUpdateEvents({
  eventIds,
  updates,
}: {
  eventIds: string[];
  updates: {
    hostOrganizationId?: string | null;
    organizerOrganizationId?: string | null;
    venueId?: string | null;
    eventType?: string | null;
    eventFormat?: string | null;
    catalogingStatus?: string | null;
  };
}) {
  try {
    if (!eventIds || eventIds.length === 0) {
      return { success: false, error: "No events selected" };
    }

    // Filter out undefined values - only update fields that were explicitly set
    const updateData: Record<string, any> = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    // If no fields to update besides updatedAt, return early
    if (Object.keys(updateData).length <= 1) {
      return { success: false, error: "No fields to update" };
    }

    await db
      .update(events)
      .set(updateData)
      .where(inArray(events.id, eventIds));

    revalidatePath("/events");
    return { success: true, updatedCount: eventIds.length };
  } catch (error: any) {
    console.error("Bulk update events error:", error);
    return { success: false, error: error.message || "Failed to update events" };
  }
}

// ============================================================================
// ORGANIZATION CSV IMPORT (Upsert with merge/fill-only for addresses)
// ============================================================================

interface CSVRow {
  Code: string;
  Name: string;
  Type: string;
  Alternative_Names?: string;
  Location_Name: string;
  Location_Type: string;
  Location_Full_Address: string;
  Location_City: string;
  Location_Country: string;
  Location_State: string;
  Location_Postal_Code: string;
}

export async function importOrganizationsFromCSV(rows: CSVRow[]) {
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // Account for header row and 0-indexing

    try {
      // Validate required fields
      if (!row.Code?.trim()) {
        errors.push(`Row ${rowNum}: Missing required field 'Code'`);
        continue;
      }
      if (!row.Name?.trim()) {
        errors.push(`Row ${rowNum}: Missing required field 'Name'`);
        continue;
      }

      const orgCode = row.Code.trim();
      const orgName = row.Name.trim();
      const orgType = row.Type?.trim() || null;
      const alternativeNames = row.Alternative_Names?.trim()
        ? row.Alternative_Names.split(",").map(n => n.trim()).filter(Boolean)
        : null;
      const locationName = row.Location_Name?.trim() || orgName;
      const locationType = row.Location_Type?.trim() || null;

      // Check if organization with this code already exists
      const [existingOrg] = await db
        .select()
        .from(organizations)
        .where(eq(organizations.code, orgCode))
        .limit(1);

      let orgId: string;
      let isNewOrg = false;

      if (existingOrg) {
        // UPDATE existing organization
        orgId = existingOrg.id;
        await db.update(organizations).set({
          name: orgName,
          orgType: orgType,
          alternativeNames: alternativeNames || existingOrg.alternativeNames,
          updatedAt: new Date(),
        }).where(eq(organizations.id, orgId));
      } else {
        // CREATE new organization
        const [newOrg] = await db.insert(organizations).values({
          code: orgCode,
          name: orgName,
          orgType: orgType,
          alternativeNames: alternativeNames,
        }).returning();
        orgId = newOrg.id;
        isNewOrg = true;
      }

      // Find primary location for this org, or the location with matching code
      const locationCode = `${orgCode}-LOC`;

      // First check if org already has a primary location
      const [existingOrgLocation] = await db
        .select({
          locationId: organizationLocations.locationId,
          location: locations,
        })
        .from(organizationLocations)
        .innerJoin(locations, eq(organizationLocations.locationId, locations.id))
        .where(and(
          eq(organizationLocations.organizationId, orgId),
          eq(organizationLocations.isPrimary, true)
        ))
        .limit(1);

      let locationId: string;

      if (existingOrgLocation) {
        // Update existing primary location
        locationId = existingOrgLocation.locationId;
        await db.update(locations).set({
          name: locationName,
          locationType: locationType || existingOrgLocation.location.locationType,
          updatedAt: new Date(),
        }).where(eq(locations.id, locationId));
      } else {
        // Check if location with this code exists (but not linked to this org)
        const [existingLoc] = await db
          .select()
          .from(locations)
          .where(eq(locations.code, locationCode))
          .limit(1);

        if (existingLoc) {
          locationId = existingLoc.id;
          // Update the location
          await db.update(locations).set({
            name: locationName,
            locationType: locationType || existingLoc.locationType,
            updatedAt: new Date(),
          }).where(eq(locations.id, locationId));
        } else {
          // Create new location
          const [newLocation] = await db.insert(locations).values({
            code: locationCode,
            name: locationName,
            locationType: locationType,
          }).returning();
          locationId = newLocation.id;
        }

        // Link organization to location (as primary)
        // First check if link already exists
        const [existingLink] = await db
          .select()
          .from(organizationLocations)
          .where(and(
            eq(organizationLocations.organizationId, orgId),
            eq(organizationLocations.locationId, locationId)
          ))
          .limit(1);

        if (!existingLink) {
          await db.insert(organizationLocations).values({
            organizationId: orgId,
            locationId: locationId,
            isPrimary: true,
            role: "HQ",
          });
        } else if (!existingLink.isPrimary) {
          // Update to make it primary
          await db.update(organizationLocations).set({
            isPrimary: true,
            updatedAt: new Date(),
          }).where(eq(organizationLocations.id, existingLink.id));
        }
      }

      // Handle address with merge/fill-only logic
      // Find primary address for this location
      const [existingLocAddress] = await db
        .select({
          linkId: locationAddresses.id,
          address: addresses,
        })
        .from(locationAddresses)
        .innerJoin(addresses, eq(locationAddresses.addressId, addresses.id))
        .where(and(
          eq(locationAddresses.locationId, locationId),
          eq(locationAddresses.isPrimary, true)
        ))
        .limit(1);

      let addressId: string;

      if (existingLocAddress) {
        // MERGE/FILL-ONLY: Only update empty fields
        addressId = existingLocAddress.address.id;
        const existingAddr = existingLocAddress.address;

        const mergeUpdates: Record<string, any> = { updatedAt: new Date() };

        // Only fill in empty fields
        if (!existingAddr.label && locationName) {
          mergeUpdates.label = locationName;
        }
        if (!existingAddr.fullAddress && row.Location_Full_Address?.trim()) {
          mergeUpdates.fullAddress = row.Location_Full_Address.trim();
        }
        if (!existingAddr.city && row.Location_City?.trim()) {
          mergeUpdates.city = row.Location_City.trim();
        }
        if (!existingAddr.stateProvince && row.Location_State?.trim()) {
          mergeUpdates.stateProvince = row.Location_State.trim();
        }
        if (!existingAddr.country && row.Location_Country?.trim()) {
          mergeUpdates.country = row.Location_Country.trim();
        }
        if (!existingAddr.postalCode && row.Location_Postal_Code?.trim()) {
          mergeUpdates.postalCode = row.Location_Postal_Code.trim();
        }

        await db.update(addresses).set(mergeUpdates).where(eq(addresses.id, addressId));
      } else {
        // No primary address exists - create new one
        const [newAddress] = await db.insert(addresses).values({
          label: locationName,
          fullAddress: row.Location_Full_Address?.trim() || null,
          city: row.Location_City?.trim() || null,
          stateProvince: row.Location_State?.trim() || null,
          country: row.Location_Country?.trim() || null,
          postalCode: row.Location_Postal_Code?.trim() || null,
        }).returning();
        addressId = newAddress.id;

        // Link location to address (as primary)
        await db.insert(locationAddresses).values({
          locationId: locationId,
          addressId: addressId,
          isPrimary: true,
        });
      }

      // Ensure a venue exists for this location+address
      const [existingVenue] = await db
        .select({ id: venues.id })
        .from(venues)
        .where(eq(venues.locationId, locationId))
        .limit(1);

      if (!existingVenue) {
        await db.insert(venues).values({
          locationId: locationId,
          addressId: addressId,
          venueType: "in_person",
        });
      }

      if (isNewOrg) {
        created++;
      } else {
        updated++;
      }
    } catch (error: any) {
      // Check for unique constraint violation
      if (error?.code === "23505") {
        errors.push(`Row ${rowNum}: Duplicate entry found - ${error.detail || error.message}`);
      } else {
        errors.push(`Row ${rowNum}: ${error.message || "Unknown error"}`);
      }
    }
  }

  revalidatePath("/organizations");
  revalidatePath("/locations");
  revalidatePath("/addresses");

  return { created, updated, errors };
}

// ============================================================================
// TRANSCRIPT ACTIONS
// ============================================================================

export async function createTranscript(formData: FormData) {
  const data = {
    mediaAssetId: (formData.get("mediaAssetId") as string) || null,
    canonicalAssetId: (formData.get("canonicalAssetId") as string) || null,
    eventSessionId: (formData.get("eventSessionId") as string) || null,
    eventSessionAssetId: (formData.get("eventSessionAssetId") as string) || null,
    language: formData.get("language") as string,
    kind: (formData.get("kind") as string) || "transcript",
    spokenSource: (formData.get("spokenSource") as string) || null,
    spokenLanguage: (formData.get("spokenLanguage") as string) || null,
    translationOf: (formData.get("translationOf") as string) || null,
    timecodeStatus: (formData.get("timecodeStatus") as string) || "none",
    source: (formData.get("source") as string) || null,
    publicationStatus: (formData.get("publicationStatus") as string) || "draft",
    createdBy: (formData.get("createdBy") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  const [newTranscript] = await db.insert(transcripts).values(data).returning();

  // Create initial revision
  await db.insert(transcriptRevisions).values({
    transcriptId: newTranscript.id,
    canonicalAssetId: data.canonicalAssetId,
    versionNumber: 1,
    editedBy: data.createdBy,
    changeNote: "Initial creation",
    statusSnapshot: data.publicationStatus,
  });

  revalidatePath("/transcripts");
  redirect(`/transcripts/${newTranscript.id}`);
}

export async function updateTranscript(id: string, formData: FormData) {
  // Get current transcript for version increment
  const [current] = await db
    .select()
    .from(transcripts)
    .where(eq(transcripts.id, id))
    .limit(1);

  if (!current) throw new Error("Transcript not found");

  const newVersion = current.version + 1;
  const editedBy = (formData.get("editedBy") as string) || null;
  const changeNote = (formData.get("changeNote") as string) || null;

  const data = {
    canonicalAssetId: (formData.get("canonicalAssetId") as string) || null,
    eventSessionId: (formData.get("eventSessionId") as string) || null,
    eventSessionAssetId: (formData.get("eventSessionAssetId") as string) || null,
    language: formData.get("language") as string,
    kind: formData.get("kind") as string,
    spokenSource: (formData.get("spokenSource") as string) || null,
    spokenLanguage: (formData.get("spokenLanguage") as string) || null,
    translationOf: (formData.get("translationOf") as string) || null,
    timecodeStatus: (formData.get("timecodeStatus") as string) || "none",
    source: (formData.get("source") as string) || null,
    publicationStatus: formData.get("publicationStatus") as string,
    version: newVersion,
    editedBy,
    notes: (formData.get("notes") as string) || null,
    updatedAt: new Date(),
  };

  await db.update(transcripts).set(data).where(eq(transcripts.id, id));

  // Create revision entry
  await db.insert(transcriptRevisions).values({
    transcriptId: id,
    canonicalAssetId: data.canonicalAssetId,
    versionNumber: newVersion,
    editedBy,
    changeNote,
    statusSnapshot: data.publicationStatus,
  });

  revalidatePath(`/transcripts/${id}`);
  redirect(`/transcripts/${id}`);
}

export async function deleteTranscript(id: string) {
  // Soft delete
  await db
    .update(transcripts)
    .set({ deletedAt: new Date() })
    .where(eq(transcripts.id, id));

  revalidatePath("/transcripts");
  redirect("/transcripts");
}

// Bulk update transcripts
export async function bulkUpdateTranscripts({
  transcriptIds,
  updates,
}: {
  transcriptIds: string[];
  updates: {
    status?: string | null;
    timecodeStatus?: string | null;
    source?: string | null;
    editedBy?: string | null;
  };
}) {
  try {
    if (!transcriptIds || transcriptIds.length === 0) {
      return { success: false, error: "No transcripts selected" };
    }

    const updateData: Record<string, any> = { updatedAt: new Date() };

    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        updateData[key] = value;
      }
    }

    if (Object.keys(updateData).length <= 1) {
      return { success: false, error: "No fields to update" };
    }

    await db
      .update(transcripts)
      .set(updateData)
      .where(inArray(transcripts.id, transcriptIds));

    revalidatePath("/transcripts");
    return { success: true, updatedCount: transcriptIds.length };
  } catch (error: any) {
    console.error("Bulk update transcripts error:", error);
    return { success: false, error: error.message || "Failed to update transcripts" };
  }
}

// Bulk delete transcripts (soft delete)
export async function bulkDeleteTranscripts(transcriptIds: string[]) {
  try {
    if (!transcriptIds || transcriptIds.length === 0) {
      return { success: false, error: "No transcripts selected" };
    }

    await db
      .update(transcripts)
      .set({ deletedAt: new Date() })
      .where(inArray(transcripts.id, transcriptIds));

    revalidatePath("/transcripts");
    return { success: true, deletedCount: transcriptIds.length };
  } catch (error: any) {
    console.error("Bulk delete transcripts error:", error);
    return { success: false, error: error.message || "Failed to delete transcripts" };
  }
}
