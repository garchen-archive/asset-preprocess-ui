"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface MetadataEditorProps {
  /** Current custom metadata (the `custom` namespace) */
  customMetadata: Record<string, unknown>;
  /** Callback when custom metadata changes */
  onCustomMetadataChange: (metadata: Record<string, unknown>) => void;
  /** Read-only namespaces to display in advanced mode */
  readOnlyNamespaces?: {
    sheetImport?: Record<string, unknown>;
    dateMeta?: Record<string, unknown>;
  };
}

/** Check if a value is a primitive (string, number, boolean, null) */
function isPrimitive(value: unknown): value is string | number | boolean | null {
  return value === null || typeof value !== "object";
}

/** Convert a value to a display string */
function toDisplayValue(value: unknown): string {
  if (value === null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value);
}

export function MetadataEditor({
  customMetadata,
  onCustomMetadataChange,
  readOnlyNamespaces,
}: MetadataEditorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Local state for JSON text - allows typing invalid JSON during edits
  const [jsonText, setJsonText] = useState(() => JSON.stringify(customMetadata, null, 2));

  // Sync jsonText when customMetadata changes from outside (e.g., simple view edits)
  // but only when not in advanced mode to avoid overwriting user edits
  const customJsonFromProps = JSON.stringify(customMetadata, null, 2);
  const [lastSyncedJson, setLastSyncedJson] = useState(customJsonFromProps);
  if (!showAdvanced && customJsonFromProps !== lastSyncedJson) {
    setJsonText(customJsonFromProps);
    setLastSyncedJson(customJsonFromProps);
    setJsonError(null);
  }

  const handleAddField = () => {
    if (!newKey.trim()) return;
    onCustomMetadataChange({
      ...customMetadata,
      [newKey.trim()]: newValue,
    });
    setNewKey("");
    setNewValue("");
  };

  const handleUpdateField = (key: string, value: string) => {
    onCustomMetadataChange({
      ...customMetadata,
      [key]: value,
    });
  };

  const handleDeleteField = (key: string) => {
    const updated = { ...customMetadata };
    delete updated[key];
    onCustomMetadataChange(updated);
  };

  const handleJsonChange = (jsonStr: string) => {
    // Always update local text state so user can type freely
    setJsonText(jsonStr);

    try {
      const parsed = JSON.parse(jsonStr);
      if (typeof parsed !== "object" || Array.isArray(parsed)) {
        setJsonError("Must be a JSON object");
        return;
      }
      setJsonError(null);
      setLastSyncedJson(JSON.stringify(parsed, null, 2));
      onCustomMetadataChange(parsed);
    } catch (e) {
      setJsonError("Invalid JSON syntax");
    }
  };

  const hasCustomFields = Object.keys(customMetadata).length > 0;
  const hasSheetImport = readOnlyNamespaces?.sheetImport && Object.keys(readOnlyNamespaces.sheetImport).length > 0;
  const hasDateMeta = readOnlyNamespaces?.dateMeta && Object.keys(readOnlyNamespaces.dateMeta).length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Custom Metadata</Label>
        <button
          type="button"
          onClick={() => {
            if (!showAdvanced) {
              // Entering advanced mode - sync JSON text with current state
              const currentJson = JSON.stringify(customMetadata, null, 2);
              setJsonText(currentJson);
              setLastSyncedJson(currentJson);
              setJsonError(null);
            }
            setShowAdvanced(!showAdvanced);
          }}
          className="text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          {showAdvanced ? "Simple view" : "Advanced (JSON)"}
        </button>
      </div>

      {!showAdvanced ? (
        /* Key-Value Editor */
        <div className="space-y-3">
          {/* Existing fields */}
          {Object.entries(customMetadata).map(([key, value]) => {
            const isEditable = isPrimitive(value);
            return (
              <div key={key} className="flex gap-2 items-start">
                <div className="flex-1">
                  <Input
                    value={key}
                    disabled
                    className="text-xs font-mono bg-muted"
                    placeholder="Key"
                  />
                </div>
                <div className="flex-[2]">
                  {isEditable ? (
                    <Input
                      value={toDisplayValue(value)}
                      onChange={(e) => handleUpdateField(key, e.target.value)}
                      className="text-sm"
                      placeholder="Value"
                    />
                  ) : (
                    <div className="relative">
                      <Input
                        value={toDisplayValue(value)}
                        disabled
                        className="text-xs font-mono bg-muted pr-16"
                        title="Nested objects can only be edited in Advanced mode"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                        (object)
                      </span>
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteField(key)}
                  className="text-muted-foreground hover:text-destructive px-2"
                >
                  ×
                </Button>
              </div>
            );
          })}

          {/* Add new field */}
          <div className="flex gap-2 items-start pt-2 border-t">
            <div className="flex-1">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                className="text-xs font-mono"
                placeholder="New key"
              />
            </div>
            <div className="flex-[2]">
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="text-sm"
                placeholder="Value"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddField();
                  }
                }}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddField}
              disabled={!newKey.trim()}
            >
              Add
            </Button>
          </div>

          {!hasCustomFields && (
            <p className="text-xs text-muted-foreground text-center py-2">
              No custom metadata. Add fields above.
            </p>
          )}
        </div>
      ) : (
        /* Advanced JSON Editor */
        <div className="space-y-4">
          {/* Editable custom namespace */}
          <div>
            <Label className="text-sm text-muted-foreground mb-1 block">
              Custom (editable)
            </Label>
            <Textarea
              value={jsonText}
              onChange={(e) => handleJsonChange(e.target.value)}
              className="font-mono text-xs min-h-[100px]"
              placeholder="{}"
            />
            {jsonError && (
              <p className="text-xs text-destructive mt-1">{jsonError}</p>
            )}
          </div>

          {/* Read-only namespaces */}
          {hasDateMeta && (
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">
                Date Metadata (read-only, managed by date fields)
              </Label>
              <Textarea
                value={JSON.stringify(readOnlyNamespaces?.dateMeta, null, 2)}
                disabled
                className="font-mono text-xs min-h-[60px] bg-muted opacity-70"
              />
            </div>
          )}

          {hasSheetImport && (
            <div>
              <Label className="text-sm text-muted-foreground mb-1 block">
                Raw Sheet Import (read-only, from CSV import)
              </Label>
              <Textarea
                value={JSON.stringify(readOnlyNamespaces?.sheetImport, null, 2)}
                disabled
                className="font-mono text-xs min-h-[100px] bg-muted opacity-70"
              />
            </div>
          )}
        </div>
      )}

      {/* Hidden input to submit custom metadata as JSON */}
      <input
        type="hidden"
        name="customMetadata"
        value={JSON.stringify(customMetadata)}
      />
    </div>
  );
}
