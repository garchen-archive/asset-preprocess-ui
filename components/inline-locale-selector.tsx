"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES } from "@/lib/locales";

interface InlineLocaleSelectorProps {
  assetId: string;
  currentLocale?: string | null;
  /** Compact mode for grid display */
  compact?: boolean;
}

export function InlineLocaleSelector({
  assetId,
  currentLocale,
  compact = false,
}: InlineLocaleSelectorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLocale, setSelectedLocale] = useState(currentLocale || "");
  const { toast } = useToast();
  const router = useRouter();

  const currentLabel = SUPPORTED_LOCALES.find((o) => o.value === currentLocale)?.label || currentLocale;

  const handleSave = async (newLocale: string) => {
    if (newLocale === currentLocale) {
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          endpoint: `/api/v1/assets/${assetId}`,
          method: "PATCH",
          data: {
            primary_locale: newLocale || null,
          },
        }),
      });

      const result = await response.json();

      if (!response.ok || result.status >= 400) {
        const errorMessage = result.message || result.data?.message || result.data?.error || `HTTP ${result.status}`;
        throw new Error(errorMessage);
      }

      const localeLabel = SUPPORTED_LOCALES.find((o) => o.value === newLocale)?.label || newLocale || "None";
      toast({
        title: "Language updated",
        description: `Set to ${localeLabel}`,
      });

      setIsEditing(false);
      router.refresh();
    } catch (error) {
      toast({
        title: "Failed to update language",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isEditing) {
    return (
      <select
        value={selectedLocale}
        onChange={(e) => {
          setSelectedLocale(e.target.value);
          handleSave(e.target.value);
        }}
        onBlur={() => {
          if (!isLoading) setIsEditing(false);
        }}
        disabled={isLoading}
        autoFocus
        className={`rounded border bg-background px-2 py-1 text-sm ${
          compact ? "w-20" : "w-32"
        } ${isLoading ? "opacity-50" : ""}`}
      >
        <option value="">None</option>
        {SUPPORTED_LOCALES.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {compact ? opt.value.toUpperCase() : opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (compact) {
    const compactLabel = SUPPORTED_LOCALES.find((o) => o.value === currentLocale)?.label || currentLocale?.toUpperCase();
    return (
      <button
        onClick={() => setIsEditing(true)}
        className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium bg-muted hover:bg-muted/80 transition-colors"
        title="Click to change language"
      >
        {compactLabel || "—"}
      </button>
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
      title="Click to change language"
    >
      {currentLabel || "Set language"}
      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
      </svg>
    </button>
  );
}
