"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { usePathname, useSearchParams } from "next/navigation";
import { getVariantLabel, VARIANT_TYPE_OPTIONS } from "@/lib/variant-types";
import { InlineLocaleSelector } from "@/components/inline-locale-selector";
import {
  getProcessingStatusLabel,
  getPublicationStatusLabel,
} from "@/lib/status-types";

type AssetRow = {
  id: string;
  linkId?: string;
  title: string | null;
  name: string | null;
  assetType: string | null;
  duration: string | null;
  catalogingStatus: string | null;
  processingStatus: string | null;
  publicationStatus?: string | null;
  eventSessionId?: string | null;
  variantType?: string | null;
  variantLabel?: string | null;
  isCanonical?: boolean | null;
  primaryLocale?: string | null;
};

// Compact dot colors for processing status
function getProcessingDotColor(status: string | null | undefined): string {
  switch (status) {
    case "ready":
      return "bg-green-500";
    case "ingesting":
    case "queued":
      return "bg-yellow-500";
    case "failed":
      return "bg-red-500";
    case "imported":
    default:
      return "bg-gray-400";
  }
}

// Compact dot colors for publication status
function getPublicationDotColor(status: string | null | undefined): string {
  switch (status) {
    case "published":
      return "bg-green-500";
    case "approved":
      return "bg-blue-500";
    case "in_review":
      return "bg-yellow-500";
    case "needs_work":
      return "bg-orange-500";
    case "archived":
      return "bg-gray-500";
    case "draft":
    default:
      return "bg-gray-400";
  }
}

type Session = {
  id: string;
  sessionName: string;
};

interface SortableAssetTableProps {
  assets: AssetRow[];
  sessions?: Session[];
  showSessionColumn?: boolean;
  showVariantColumn?: boolean;
  showLocaleColumn?: boolean;
  tableId: string; // Used to namespace sort params (e.g., "direct" or "session")
  onVariantChange?: (linkId: string, newVariantType: string) => Promise<void>;
}

export function SortableAssetTable({
  assets,
  sessions = [],
  showSessionColumn = false,
  showVariantColumn = false,
  showLocaleColumn = false,
  tableId,
  onVariantChange,
}: SortableAssetTableProps) {
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current sort state from URL
  const sortByParam = `${tableId}SortBy`;
  const sortOrderParam = `${tableId}SortOrder`;
  const sortBy = searchParams.get(sortByParam) || "title";
  const sortOrder = searchParams.get(sortOrderParam) || "asc";

  // Sort assets client-side based on URL params
  const sortedAssets = [...assets].sort((a, b) => {
    let aVal: string | null = null;
    let bVal: string | null = null;

    switch (sortBy) {
      case "title":
        aVal = a.title || a.name || "";
        bVal = b.title || b.name || "";
        break;
      case "name":
        aVal = a.name || "";
        bVal = b.name || "";
        break;
      case "type":
        aVal = a.assetType || "";
        bVal = b.assetType || "";
        break;
      case "duration":
        aVal = a.duration || "";
        bVal = b.duration || "";
        break;
      case "status":
        aVal = a.catalogingStatus || "";
        bVal = b.catalogingStatus || "";
        break;
      case "session":
        const sessionA = sessions.find((s) => s.id === a.eventSessionId);
        const sessionB = sessions.find((s) => s.id === b.eventSessionId);
        aVal = sessionA?.sessionName || "";
        bVal = sessionB?.sessionName || "";
        break;
      case "variant":
        aVal = a.variantLabel || a.variantType || "";
        bVal = b.variantLabel || b.variantType || "";
        break;
      case "locale":
        aVal = a.primaryLocale || "";
        bVal = b.primaryLocale || "";
        break;
      default:
        aVal = a.title || a.name || "";
        bVal = b.title || b.name || "";
    }

    const comparison = (aVal || "").localeCompare(bVal || "");
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const getSortUrl = (column: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const newSortOrder = sortBy === column && sortOrder === "asc" ? "desc" : "asc";
    params.set(sortByParam, column);
    params.set(sortOrderParam, newSortOrder);
    return `${pathname}?${params.toString()}`;
  };

  const SortableHeader = ({
    column,
    children,
  }: {
    column: string;
    children: React.ReactNode;
  }) => {
    const isActive = sortBy === column;
    return (
      <th className="px-4 py-3 text-left text-sm font-medium">
        <Link
          href={getSortUrl(column)}
          className="flex items-center gap-1 hover:underline group cursor-pointer"
          scroll={false}
        >
          {children}
          {isActive ? (
            <span className="text-xs font-bold">
              {sortOrder === "asc" ? "↑" : "↓"}
            </span>
          ) : (
            <span className="text-xs text-muted-foreground/40 group-hover:text-muted-foreground transition-colors">
              ↕
            </span>
          )}
        </Link>
      </th>
    );
  };

  return (
    <div className="rounded-md border">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <SortableHeader column="title">Title</SortableHeader>
            <SortableHeader column="type">Type</SortableHeader>
            <SortableHeader column="duration">Duration</SortableHeader>
            {showSessionColumn && (
              <SortableHeader column="session">Session</SortableHeader>
            )}
            {showVariantColumn && (
              <SortableHeader column="variant">Variant</SortableHeader>
            )}
            {showLocaleColumn && (
              <SortableHeader column="locale">Lang</SortableHeader>
            )}
            <SortableHeader column="status">Status</SortableHeader>
            <th className="px-4 py-3 text-left text-sm font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {sortedAssets.map((asset) => {
            const session = sessions.find((s) => s.id === asset.eventSessionId);
            return (
              <tr key={asset.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/assets/${asset.id}`}
                      className="font-medium text-blue-600 hover:underline"
                    >
                      {asset.title || asset.name || "Untitled"}
                    </Link>
                    {asset.isCanonical && (
                      <Badge className="bg-green-100 text-green-800 text-xs">Canonical</Badge>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">{asset.assetType || "—"}</td>
                <td className="px-4 py-3 text-sm">{asset.duration || "—"}</td>
                {showSessionColumn && (
                  <td className="px-4 py-3 text-sm">
                    {session ? (
                      <Link
                        href={`/sessions/${session.id}`}
                        className="text-blue-600 hover:underline text-xs"
                      >
                        {session.sessionName}
                      </Link>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                {showVariantColumn && (
                  <td className="px-4 py-3 text-sm">
                    {onVariantChange && asset.linkId ? (
                      editingLinkId === asset.linkId ? (
                        <select
                          value={asset.variantType || "source"}
                          onChange={async (e) => {
                            setIsUpdating(true);
                            await onVariantChange(asset.linkId!, e.target.value);
                            setEditingLinkId(null);
                            setIsUpdating(false);
                          }}
                          onBlur={() => setEditingLinkId(null)}
                          disabled={isUpdating}
                          autoFocus
                          className="text-xs border rounded px-1 py-0.5 bg-background"
                        >
                          {VARIANT_TYPE_OPTIONS.map((vt) => (
                            <option key={vt.value} value={vt.value}>
                              {vt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <button
                          onClick={() => setEditingLinkId(asset.linkId!)}
                          className="hover:bg-muted rounded px-1 py-0.5 transition-colors"
                          title="Click to edit variant type"
                        >
                          <Badge variant="outline" className="text-xs cursor-pointer">
                            {asset.variantLabel || getVariantLabel(asset.variantType) || "Source"}
                          </Badge>
                        </button>
                      )
                    ) : asset.variantLabel || asset.variantType ? (
                      <Badge variant="outline" className="text-xs">
                        {asset.variantLabel || getVariantLabel(asset.variantType)}
                      </Badge>
                    ) : (
                      "—"
                    )}
                  </td>
                )}
                {showLocaleColumn && (
                  <td className="px-4 py-3 text-sm">
                    <InlineLocaleSelector
                      assetId={asset.id}
                      currentLocale={asset.primaryLocale}
                      compact
                    />
                  </td>
                )}
                <td className="px-4 py-3 text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${getProcessingDotColor(asset.processingStatus)}`}
                      title={`Processing: ${getProcessingStatusLabel(asset.processingStatus)}`}
                    />
                    <div
                      className={`w-2.5 h-2.5 rounded-full ${getPublicationDotColor(asset.publicationStatus)}`}
                      title={`Publication: ${getPublicationStatusLabel(asset.publicationStatus)}`}
                    />
                  </div>
                </td>
                <td className="px-4 py-3 text-sm">
                  <Link
                    href={`/assets/${asset.id}`}
                    className="text-blue-600 hover:underline"
                  >
                    View
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {sortedAssets.length === 0 && (
        <div className="text-center py-8 text-sm text-muted-foreground">
          No assets found.
        </div>
      )}
    </div>
  );
}
