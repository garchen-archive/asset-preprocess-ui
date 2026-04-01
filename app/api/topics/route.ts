import { db } from "@/lib/db/client";
import { topic, topicType, topicClassification } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { name, typeIds } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Create the topic
    const [newTopic] = await db
      .insert(topic)
      .values({ name: name.trim() })
      .returning();

    // If typeIds provided, create classifications
    if (typeIds && Array.isArray(typeIds) && typeIds.length > 0) {
      await db.insert(topicClassification).values(
        typeIds.map((typeId: string) => ({
          topicId: newTopic.id,
          topicTypeId: typeId,
        }))
      );
    }

    // Fetch the topic with its types
    const topicWithTypes = await getTopicWithTypes(newTopic.id);
    return NextResponse.json(topicWithTypes);
  } catch (error: any) {
    console.error("Error creating topic:", error);

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "A topic with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create topic" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get all topics
    const allTopics = await db.select().from(topic).orderBy(topic.name);

    // Get all topic types
    const allTypes = await db.select().from(topicType).orderBy(topicType.name);

    // Get all classifications
    const allClassifications = await db.select().from(topicClassification);

    // Build a map of topic ID to type IDs
    const topicTypesMap = new Map<string, string[]>();
    allClassifications.forEach((c) => {
      const existing = topicTypesMap.get(c.topicId) || [];
      existing.push(c.topicTypeId);
      topicTypesMap.set(c.topicId, existing);
    });

    // Build type lookup
    const typeMap = new Map(allTypes.map((t) => [t.id, t]));

    // Return topics with their types
    const topicsWithTypes = allTopics.map((t) => ({
      ...t,
      typeIds: topicTypesMap.get(t.id) || [],
      types: (topicTypesMap.get(t.id) || [])
        .map((typeId) => typeMap.get(typeId))
        .filter(Boolean),
    }));

    return NextResponse.json({
      topics: topicsWithTypes,
      topicTypes: allTypes,
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}

async function getTopicWithTypes(topicId: string) {
  const [t] = await db.select().from(topic).where(eq(topic.id, topicId));
  if (!t) return null;

  const classifications = await db
    .select()
    .from(topicClassification)
    .where(eq(topicClassification.topicId, topicId));

  const typeIds = classifications.map((c) => c.topicTypeId);
  const types = typeIds.length > 0
    ? await db.select().from(topicType).where(eq(topicType.id, typeIds[0]))
    : [];

  return {
    ...t,
    typeIds,
    types,
  };
}
