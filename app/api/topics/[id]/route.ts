import { db } from "@/lib/db/client";
import { topic, topicType, topicClassification } from "@/lib/db/schema";
import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { name, typeIds } = await request.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    // Update the topic name
    const [updatedTopic] = await db
      .update(topic)
      .set({ name: name.trim(), updatedAt: new Date() })
      .where(eq(topic.id, params.id))
      .returning();

    if (!updatedTopic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    // Update classifications if typeIds provided
    if (typeIds !== undefined && Array.isArray(typeIds)) {
      // Delete existing classifications
      await db
        .delete(topicClassification)
        .where(eq(topicClassification.topicId, params.id));

      // Insert new classifications
      if (typeIds.length > 0) {
        await db.insert(topicClassification).values(
          typeIds.map((typeId: string) => ({
            topicId: params.id,
            topicTypeId: typeId,
          }))
        );
      }
    }

    // Fetch the topic with its types
    const topicWithTypes = await getTopicWithTypes(params.id);
    return NextResponse.json(topicWithTypes);
  } catch (error: any) {
    console.error("Error updating topic:", error);

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "A topic with this name already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to update topic" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Delete will cascade to junction tables due to ON DELETE CASCADE
    const [deletedTopic] = await db
      .delete(topic)
      .where(eq(topic.id, params.id))
      .returning();

    if (!deletedTopic) {
      return NextResponse.json({ error: "Topic not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting topic:", error);
    return NextResponse.json(
      { error: "Failed to delete topic" },
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

  let types: any[] = [];
  if (typeIds.length > 0) {
    types = await db
      .select()
      .from(topicType)
      .where(inArray(topicType.id, typeIds));
  }

  return {
    ...t,
    typeIds,
    types,
  };
}
