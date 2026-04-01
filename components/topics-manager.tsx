"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Topic, TopicType } from "@/lib/db/schema";

interface TopicWithTypes extends Topic {
  typeIds: string[];
}

interface TopicsManagerProps {
  initialTopics: TopicWithTypes[];
  initialTopicTypes: TopicType[];
}

export function TopicsManager({ initialTopics, initialTopicTypes }: TopicsManagerProps) {
  const [topics, setTopics] = useState<TopicWithTypes[]>(initialTopics);
  const [topicTypes] = useState<TopicType[]>(initialTopicTypes);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicTypeIds, setNewTopicTypeIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingTypeIds, setEditingTypeIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(topicTypes.map((t) => t.id))
  );

  // Create type lookup map
  const typeMap = useMemo(() => new Map(topicTypes.map((t) => [t.id, t])), [topicTypes]);

  // Group topics by type (a topic can appear in multiple groups)
  const { topicsByType, unclassifiedTopics } = useMemo(() => {
    const grouped = new Map<string, TopicWithTypes[]>();
    topicTypes.forEach((type) => grouped.set(type.id, []));
    const unclassified: TopicWithTypes[] = [];

    topics.forEach((topic) => {
      if (topic.typeIds.length === 0) {
        unclassified.push(topic);
      } else {
        topic.typeIds.forEach((typeId) => {
          const existing = grouped.get(typeId) || [];
          grouped.set(typeId, [...existing, topic]);
        });
      }
    });

    // Sort topics within each group
    grouped.forEach((topicList, typeId) => {
      grouped.set(
        typeId,
        topicList.sort((a, b) => a.name.localeCompare(b.name))
      );
    });

    return {
      topicsByType: grouped,
      unclassifiedTopics: unclassified.sort((a, b) => a.name.localeCompare(b.name)),
    };
  }, [topics, topicTypes]);

  const toggleType = (typeId: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(typeId)) {
      newExpanded.delete(typeId);
    } else {
      newExpanded.add(typeId);
    }
    setExpandedTypes(newExpanded);
  };

  const toggleNewTopicType = (typeId: string) => {
    setNewTopicTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const toggleEditingType = (typeId: string) => {
    setEditingTypeIds((prev) =>
      prev.includes(typeId) ? prev.filter((id) => id !== typeId) : [...prev, typeId]
    );
  };

  const handleCreate = async () => {
    if (!newTopicName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTopicName.trim(), typeIds: newTopicTypeIds }),
      });

      if (response.ok) {
        const newTopic = await response.json();
        setTopics([...topics, newTopic].sort((a, b) => a.name.localeCompare(b.name)));
        setNewTopicName("");
        setNewTopicTypeIds([]);
      }
    } catch (error) {
      console.error("Failed to create topic:", error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const response = await fetch(`/api/topics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingName.trim(), typeIds: editingTypeIds }),
      });

      if (response.ok) {
        const updatedTopic = await response.json();
        setTopics(
          topics
            .map((t) => (t.id === id ? updatedTopic : t))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        setEditingId(null);
        setEditingName("");
        setEditingTypeIds([]);
      }
    } catch (error) {
      console.error("Failed to update topic:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this topic? This will remove it from all events and sessions."
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/topics/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        setTopics(topics.filter((t) => t.id !== id));
      }
    } catch (error) {
      console.error("Failed to delete topic:", error);
    }
  };

  const startEdit = (topic: TopicWithTypes) => {
    setEditingId(topic.id);
    setEditingName(topic.name);
    setEditingTypeIds(topic.typeIds);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingTypeIds([]);
  };

  const getTypeNames = (typeIds: string[]) => {
    return typeIds
      .map((id) => typeMap.get(id)?.name)
      .filter(Boolean)
      .join(", ");
  };

  const renderTopicRow = (topic: TopicWithTypes) => (
    <div
      key={topic.id}
      className="p-3 pl-10 flex items-center gap-3 hover:bg-muted/40 border-t first:border-t-0"
    >
      {editingId === topic.id ? (
        <>
          <Input
            type="text"
            value={editingName}
            onChange={(e) => setEditingName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleUpdate(topic.id);
              } else if (e.key === "Escape") {
                cancelEdit();
              }
            }}
            className="flex-1"
            autoFocus
          />
          <div className="flex flex-wrap gap-2 min-w-[200px]">
            {topicTypes.map((type) => (
              <label
                key={type.id}
                className="flex items-center gap-1 text-xs cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={editingTypeIds.includes(type.id)}
                  onChange={() => toggleEditingType(type.id)}
                  className="h-3 w-3"
                />
                {type.name}
              </label>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleUpdate(topic.id)}
            disabled={!editingName.trim()}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={cancelEdit}>
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <>
          <div className="flex-1 text-sm font-medium">{topic.name}</div>
          {topic.typeIds.length > 1 && (
            <Badge variant="outline" className="text-xs">
              +{topic.typeIds.length - 1} more
            </Badge>
          )}
          <Button variant="ghost" size="sm" onClick={() => startEdit(topic)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(topic.id)}
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* Create new topic */}
      <div className="rounded-lg border p-4 bg-muted/20">
        <div className="flex flex-col gap-3">
          <div className="flex gap-2">
            <Input
              type="text"
              value={newTopicName}
              onChange={(e) => setNewTopicName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleCreate();
                }
              }}
              placeholder="Enter new topic name..."
              className="flex-1"
            />
            <Button onClick={handleCreate} disabled={isCreating || !newTopicName.trim()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Topic
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            <span className="text-sm text-muted-foreground">Types:</span>
            {topicTypes.map((type) => (
              <label
                key={type.id}
                className="flex items-center gap-1.5 text-sm cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={newTopicTypeIds.includes(type.id)}
                  onChange={() => toggleNewTopicType(type.id)}
                  className="h-4 w-4"
                />
                {type.name}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Topics list grouped by type */}
      <div className="rounded-lg border">
        <div className="p-4 border-b bg-muted/50">
          <h2 className="font-semibold">All Topics ({topics.length})</h2>
        </div>
        {topics.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            No topics yet. Create one above to get started.
          </div>
        ) : (
          <div>
            {topicTypes.map((type) => {
              const typeTopics = topicsByType.get(type.id) || [];
              const isExpanded = expandedTypes.has(type.id);

              return (
                <div key={type.id} className="border-b last:border-b-0">
                  {/* Type header */}
                  <button
                    onClick={() => toggleType(type.id)}
                    className="w-full p-4 flex items-center gap-2 hover:bg-muted/30 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold">{type.name}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {typeTopics.length}
                    </Badge>
                  </button>

                  {/* Topics under this type */}
                  {isExpanded && (
                    <div className="bg-muted/20">
                      {typeTopics.length === 0 ? (
                        <div className="p-4 pl-10 text-sm text-muted-foreground italic">
                          No topics in this category yet
                        </div>
                      ) : (
                        typeTopics.map(renderTopicRow)
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Unclassified topics */}
            {unclassifiedTopics.length > 0 && (
              <div className="border-b last:border-b-0">
                <button
                  onClick={() => toggleType("unclassified")}
                  className="w-full p-4 flex items-center gap-2 hover:bg-muted/30 transition-colors"
                >
                  {expandedTypes.has("unclassified") ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold">Unclassified</span>
                  <Badge variant="outline" className="ml-auto">
                    {unclassifiedTopics.length}
                  </Badge>
                </button>

                {expandedTypes.has("unclassified") && (
                  <div className="bg-muted/20">{unclassifiedTopics.map(renderTopicRow)}</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
