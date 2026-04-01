import { db } from "@/lib/db/client";
import { topic, topicType, topicClassification, category } from "@/lib/db/schema";
import { asc, eq, inArray } from "drizzle-orm";
import { TopicsManager } from "@/components/topics-manager";
import { CategoriesManager } from "@/components/categories-manager";

export const dynamic = "force-dynamic";

export default async function TaxonomyPage() {
  // Fetch all topics
  const allTopics = await db.select().from(topic).orderBy(asc(topic.name));

  // Fetch all topic types
  const allTopicTypes = await db.select().from(topicType).orderBy(asc(topicType.name));

  // Fetch all classifications
  const allClassifications = await db.select().from(topicClassification);

  // Build a map of topic ID to type IDs
  const topicTypesMap = new Map<string, string[]>();
  allClassifications.forEach((c) => {
    const existing = topicTypesMap.get(c.topicId) || [];
    existing.push(c.topicTypeId);
    topicTypesMap.set(c.topicId, existing);
  });

  // Enrich topics with their type IDs
  const topicsWithTypes = allTopics.map((t) => ({
    ...t,
    typeIds: topicTypesMap.get(t.id) || [],
  }));

  const allCategories = await db.select().from(category).orderBy(asc(category.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Topics & Categories</h1>
        <p className="text-muted-foreground">
          Manage topics and categories that can be assigned to events and sessions
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-semibold mb-4">Topics</h2>
          <TopicsManager initialTopics={topicsWithTypes} initialTopicTypes={allTopicTypes} />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Categories</h2>
          <CategoriesManager initialCategories={allCategories} />
        </div>
      </div>
    </div>
  );
}
