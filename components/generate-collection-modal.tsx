"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

interface Session {
  id: string;
  sessionName: string;
  dayNumber?: number | null;
  dayLabel?: string | null;
  sessionDate?: string | null;
}

interface ItemOverride {
  label?: string;
  dayLabel?: string;
  playlistRole?: string;
  skip?: boolean;
}

interface GenerateCollectionModalProps {
  eventId: string;
  eventName: string;
  sessions: Session[];
  hasExistingCollection: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface CollectionPreview {
  name: string;
  description: string;
  visibility: string;
  isDefault: boolean;
}

interface ItemPreview {
  sessionId: string;
  sessionName: string;
  sequence: number;
  label: string;
  dayLabel: string;
  playlistRole: string;
  skipped: boolean;
}

export function GenerateCollectionModal({
  eventId,
  eventName,
  sessions,
  hasExistingCollection,
  onClose,
  onSuccess,
}: GenerateCollectionModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [preview, setPreview] = useState<{ collection: CollectionPreview; items: ItemPreview[] } | null>(null);
  const { toast } = useToast();

  // Collection-level settings
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("public");

  // Item overrides keyed by session ID
  const [itemOverrides, setItemOverrides] = useState<Record<string, ItemOverride>>({});

  // Track which sessions are expanded for editing
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  const updateItemOverride = (sessionId: string, field: keyof ItemOverride, value: string | boolean) => {
    setItemOverrides((prev) => ({
      ...prev,
      [sessionId]: {
        ...prev[sessionId],
        [field]: value,
      },
    }));
  };

  const toggleSessionSkip = (sessionId: string) => {
    const current = itemOverrides[sessionId]?.skip || false;
    updateItemOverride(sessionId, "skip", !current);
  };

  const toggleSessionExpanded = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  };

  const buildRequestBody = () => {
    const body: Record<string, unknown> = {
      overwrite_existing: hasExistingCollection,
    };

    if (name.trim()) {
      body.name = name.trim();
    }
    if (description.trim()) {
      body.description = description.trim();
    }
    if (visibility) {
      body.visibility = visibility;
    }

    // Only include item overrides that have actual values
    const filteredOverrides: Record<string, ItemOverride> = {};
    for (const [sessionId, override] of Object.entries(itemOverrides)) {
      const hasValues = override.skip || override.label || override.dayLabel || override.playlistRole;
      if (hasValues) {
        filteredOverrides[sessionId] = {};
        if (override.skip) filteredOverrides[sessionId].skip = true;
        if (override.label?.trim()) filteredOverrides[sessionId].label = override.label.trim();
        if (override.dayLabel?.trim()) filteredOverrides[sessionId].dayLabel = override.dayLabel.trim();
        if (override.playlistRole) filteredOverrides[sessionId].playlistRole = override.playlistRole;
      }
    }

    if (Object.keys(filteredOverrides).length > 0) {
      body.item_overrides = filteredOverrides;
    }

    return body;
  };

  const handlePreview = async () => {
    setIsPreviewing(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/events/${eventId}/collections/preview-default`,
          method: "POST",
          data: buildRequestBody(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      setPreview(result.data);
    } catch (error) {
      toast({
        title: "Preview Error",
        description: error instanceof Error ? error.message : "Failed to preview collection",
        variant: "destructive",
      });
    } finally {
      setIsPreviewing(false);
    }
  };

  const handleGenerate = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/admin/events/${eventId}/collections/generate-default`,
          method: "POST",
          data: buildRequestBody(),
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        throw new Error(result.error || result.data?.error || `HTTP ${result.status}`);
      }

      toast({
        title: hasExistingCollection ? "Collection regenerated" : "Collection generated",
        description: `Created ${result.data?.items?.length || 0} items from sessions`,
      });

      onSuccess();
      onClose();
      window.location.reload();
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate collection",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const skippedCount = Object.values(itemOverrides).filter((o) => o.skip).length;
  const includedCount = sessions.length - skippedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-lg font-semibold">
                {hasExistingCollection ? "Regenerate" : "Generate"} Collection
              </h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Create a default collection for <strong>{eventName}</strong>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 -mt-1 -mr-1 p-1"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-6 overflow-y-auto flex-grow">
          {/* Quick generate option */}
          {!showAdvanced && !preview && (
            <div className="bg-muted/30 rounded-lg p-4 space-y-3">
              <p className="text-sm">
                Generate a collection with {sessions.length} session{sessions.length !== 1 ? "s" : ""} using default settings.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleGenerate} disabled={isSubmitting || sessions.length === 0}>
                  {isSubmitting ? "Generating..." : "Generate Now"}
                </Button>
                <Button variant="outline" onClick={() => setShowAdvanced(true)}>
                  Customize Options
                </Button>
              </div>
            </div>
          )}

          {/* Advanced options */}
          {showAdvanced && !preview && (
            <>
              {/* Collection Settings */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                  Collection Settings
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={eventName}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Leave blank to use event name
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="visibility">Visibility</Label>
                    <select
                      id="visibility"
                      value={visibility}
                      onChange={(e) => setVisibility(e.target.value)}
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      <option value="public">Public</option>
                      <option value="shared">Shared</option>
                      <option value="private">Private</option>
                    </select>
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder={`Auto-generated viewing order for ${eventName}`}
                    rows={2}
                  />
                </div>
              </div>

              {/* Sessions List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                    Sessions ({includedCount} of {sessions.length})
                  </h3>
                  {skippedCount > 0 && (
                    <span className="text-xs text-amber-600">
                      {skippedCount} skipped
                    </span>
                  )}
                </div>

                <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                  {sessions.map((session, index) => {
                    const override = itemOverrides[session.id] || {};
                    const isSkipped = override.skip || false;
                    const isExpanded = expandedSessions.has(session.id);

                    return (
                      <div
                        key={session.id}
                        className={`${isSkipped ? "bg-muted/50 opacity-60" : ""}`}
                      >
                        <div className="flex items-center gap-3 px-4 py-2">
                          <input
                            type="checkbox"
                            checked={!isSkipped}
                            onChange={() => toggleSessionSkip(session.id)}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                          <span className="text-sm text-muted-foreground w-6">
                            {index + 1}.
                          </span>
                          <div className="flex-grow min-w-0">
                            <p className={`text-sm truncate ${isSkipped ? "line-through" : ""}`}>
                              {session.sessionName}
                            </p>
                            {session.dayLabel && (
                              <p className="text-xs text-muted-foreground">{session.dayLabel}</p>
                            )}
                          </div>
                          {!isSkipped && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleSessionExpanded(session.id)}
                              className="text-xs"
                            >
                              {isExpanded ? "Hide" : "Edit"}
                            </Button>
                          )}
                        </div>

                        {/* Expanded edit options */}
                        {isExpanded && !isSkipped && (
                          <div className="px-4 pb-3 pt-1 bg-muted/20 grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-xs">Custom Label</Label>
                              <Input
                                value={override.label || ""}
                                onChange={(e) => updateItemOverride(session.id, "label", e.target.value)}
                                placeholder={session.sessionName}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Day Label</Label>
                              <Input
                                value={override.dayLabel || ""}
                                onChange={(e) => updateItemOverride(session.id, "dayLabel", e.target.value)}
                                placeholder={session.dayLabel || ""}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Role</Label>
                              <select
                                value={override.playlistRole || "session"}
                                onChange={(e) => updateItemOverride(session.id, "playlistRole", e.target.value)}
                                className="w-full h-8 rounded-md border border-input bg-background px-2 text-sm"
                              >
                                <option value="session">Session</option>
                                <option value="session_variant">Variant</option>
                                <option value="supplemental">Supplemental</option>
                                <option value="reference">Reference</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Preview Results */}
          {preview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Preview</h3>
                <Button variant="ghost" size="sm" onClick={() => setPreview(null)}>
                  Back to Edit
                </Button>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-2">
                <p className="font-medium">{preview.collection.name}</p>
                <p className="text-sm text-muted-foreground">{preview.collection.description}</p>
                <div className="flex gap-2 text-xs">
                  <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                    {preview.collection.visibility}
                  </span>
                  {preview.collection.isDefault && (
                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded">
                      Default
                    </span>
                  )}
                </div>
              </div>

              <div className="border rounded-lg divide-y max-h-[250px] overflow-y-auto">
                {preview.items.map((item) => (
                  <div
                    key={item.sessionId}
                    className={`flex items-center gap-3 px-4 py-2 ${item.skipped ? "bg-muted/50 opacity-60" : ""}`}
                  >
                    <span className="text-sm text-muted-foreground w-6">
                      {item.skipped ? "—" : `${item.sequence}.`}
                    </span>
                    <div className="flex-grow">
                      <p className={`text-sm ${item.skipped ? "line-through" : ""}`}>
                        {item.label}
                      </p>
                      {item.dayLabel && (
                        <p className="text-xs text-muted-foreground">{item.dayLabel}</p>
                      )}
                    </div>
                    {item.skipped && (
                      <span className="text-xs text-amber-600">Skipped</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-muted-foreground">
            {includedCount} session{includedCount !== 1 ? "s" : ""} will be included
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            {showAdvanced && !preview && (
              <Button variant="outline" onClick={handlePreview} disabled={isPreviewing || includedCount === 0}>
                {isPreviewing ? "Loading..." : "Preview"}
              </Button>
            )}
            {(showAdvanced || preview) && (
              <Button onClick={handleGenerate} disabled={isSubmitting || includedCount === 0}>
                {isSubmitting
                  ? "Generating..."
                  : hasExistingCollection
                  ? "Regenerate"
                  : "Generate"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
