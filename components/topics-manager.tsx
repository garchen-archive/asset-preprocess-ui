"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Pencil, Trash2, X, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Topic } from "@/lib/db/schema";
import { TOPIC_TYPES, type TopicType } from "@/lib/constants";

interface TopicsManagerProps {
  initialTopics: Topic[];
}

export function TopicsManager({ initialTopics }: TopicsManagerProps) {
  const [topics, setTopics] = useState<Topic[]>(initialTopics);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicType, setNewTopicType] = useState<TopicType>(TOPIC_TYPES[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingType, setEditingType] = useState<TopicType | "">("");
  const [isCreating, setIsCreating] = useState(false);
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(
    new Set(TOPIC_TYPES)
  );

  // Group topics by type
  const { topicsByType, otherTopics } = useMemo(() => {
    const grouped = new Map<string, Topic[]>();
    TOPIC_TYPES.forEach(type => grouped.set(type, []));
    const other: Topic[] = [];

    topics.forEach(topic => {
      if (TOPIC_TYPES.includes(topic.type as TopicType)) {
        const existing = grouped.get(topic.type) || [];
        grouped.set(topic.type, [...existing, topic]);
      } else {
        other.push(topic);
      }
    });

    return { topicsByType: grouped, otherTopics: other };
  }, [topics]);

  const toggleType = (type: string) => {
    const newExpanded = new Set(expandedTypes);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedTypes(newExpanded);
  };

  const handleCreate = async () => {
    if (!newTopicName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch("/api/topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTopicName.trim(), type: newTopicType }),
      });

      if (response.ok) {
        const newTopic = await response.json();
        setTopics([...topics, newTopic].sort((a, b) => a.name.localeCompare(b.name)));
        setNewTopicName("");
        setNewTopicType(TOPIC_TYPES[0]);
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
        body: JSON.stringify({ name: editingName.trim(), type: editingType }),
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
        setEditingType("");
      }
    } catch (error) {
      console.error("Failed to update topic:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this topic? This will remove it from all events and sessions.")) {
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

  const startEdit = (topic: Topic) => {
    setEditingId(topic.id);
    setEditingName(topic.name);
    setEditingType(topic.type as TopicType);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingName("");
    setEditingType("");
  };

  return (
    <div className="space-y-4">
      {/* Create new topic */}
      <div className="rounded-lg border p-4 bg-muted/20">
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
          <select
            value={newTopicType}
            onChange={(e) => setNewTopicType(e.target.value as TopicType)}
            className="flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm min-w-[180px]"
          >
            {TOPIC_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <Button onClick={handleCreate} disabled={isCreating || !newTopicName.trim()}>
            <Plus className="h-4 w-4 mr-2" />
            Add Topic
          </Button>
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
            {TOPIC_TYPES.map((type) => {
              const typeTopics = topicsByType.get(type) || [];
              const isExpanded = expandedTypes.has(type);

              return (
                <div key={type} className="border-b last:border-b-0">
                  {/* Type header */}
                  <button
                    onClick={() => toggleType(type)}
                    className="w-full p-4 flex items-center gap-2 hover:bg-muted/30 transition-colors"
                  >
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold">{type}</span>
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
                        typeTopics.map((topic) => (
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
                                <select
                                  value={editingType}
                                  onChange={(e) => setEditingType(e.target.value as TopicType)}
                                  className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[160px]"
                                >
                                  {TOPIC_TYPES.map((t) => (
                                    <option key={t} value={t}>
                                      {t}
                                    </option>
                                  ))}
                                </select>
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
                        ))
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Other topics (imported, etc.) */}
            {otherTopics.length > 0 && (
              <div className="border-b last:border-b-0">
                <button
                  onClick={() => toggleType("Other")}
                  className="w-full p-4 flex items-center gap-2 hover:bg-muted/30 transition-colors"
                >
                  {expandedTypes.has("Other") ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  )}
                  <span className="font-semibold">Other</span>
                  <Badge variant="outline" className="ml-auto">
                    {otherTopics.length}
                  </Badge>
                </button>

                {expandedTypes.has("Other") && (
                  <div className="bg-muted/20">
                    {otherTopics.map((topic) => (
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
                            <select
                              value={editingType}
                              onChange={(e) => setEditingType(e.target.value as TopicType)}
                              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm min-w-[160px]"
                            >
                              {TOPIC_TYPES.map((t) => (
                                <option key={t} value={t}>
                                  {t}
                                </option>
                              ))}
                            </select>
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
                            <Badge variant="outline" className="text-xs">
                              {topic.type}
                            </Badge>
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
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
