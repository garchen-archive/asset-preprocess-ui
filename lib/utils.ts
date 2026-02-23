import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Date metadata types
export type DatePrecision = "year" | "month" | "day";
export type DateQualifier = "exact" | "approximate" | "before" | "after" | "inferred";

export interface DateMeta {
  startPrecision?: DatePrecision;
  endPrecision?: DatePrecision;
  qualifier?: DateQualifier;
}

function parseDate(dateStr: string): Date | null {
  // Handle YYYY-MM-DD or ISO timestamps
  const match = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/**
 * Format a date string with optional precision and qualifier.
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param precision - "year", "month", or "day" (default: "day")
 * @param qualifier - "exact", "approximate", "before", "after", "inferred" (default: "exact")
 */
export function formatDate(
  dateStr: string | null | undefined,
  precision: DatePrecision = "day",
  qualifier: DateQualifier = "exact"
): string {
  if (!dateStr) return "—";
  const d = parseDate(dateStr);
  if (!d) return dateStr;

  // Format based on precision
  let formatted: string;
  switch (precision) {
    case "year":
      formatted = `${d.getFullYear()}`;
      break;
    case "month":
      formatted = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      break;
    case "day":
    default:
      formatted = `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
      break;
  }

  // Add qualifier prefix
  switch (qualifier) {
    case "approximate":
      return `circa ${formatted}`;
    case "before":
      return `before ${formatted}`;
    case "after":
      return `after ${formatted}`;
    case "inferred":
      return `[${formatted}]`;
    case "exact":
    default:
      return formatted;
  }
}

/**
 * Format a date range with optional precision and qualifier from dateMeta.
 * @param start - Start date string
 * @param end - End date string
 * @param dateMeta - Optional metadata with precision and qualifier
 */
export function formatDateRange(
  start: string | null | undefined,
  end: string | null | undefined,
  dateMeta?: DateMeta
): string {
  const startPrecision = dateMeta?.startPrecision || "day";
  const endPrecision = dateMeta?.endPrecision || "day";
  const qualifier = dateMeta?.qualifier || "exact";

  if (!start && !end) return "—";
  if (!start) return formatDate(end, endPrecision, qualifier);
  if (!end) return formatDate(start, startPrecision, qualifier);

  const s = parseDate(start);
  const e = parseDate(end);

  if (!s || !e) return `${formatDate(start, startPrecision, qualifier)} – ${formatDate(end, endPrecision, qualifier)}`;

  // If both dates are the same, just show one
  if (s.getTime() === e.getTime()) return formatDate(start, startPrecision, qualifier);

  // For partial dates (year or month precision), show simpler range
  if (startPrecision === "year" || endPrecision === "year") {
    const startYear = s.getFullYear();
    const endYear = e.getFullYear();
    const baseRange = startYear === endYear ? `${startYear}` : `${startYear}–${endYear}`;
    return applyQualifier(baseRange, qualifier);
  }

  if (startPrecision === "month" || endPrecision === "month") {
    if (s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth()) {
      return applyQualifier(`${MONTHS[s.getMonth()]} ${s.getFullYear()}`, qualifier);
    }
    if (s.getFullYear() === e.getFullYear()) {
      return applyQualifier(`${MONTHS[s.getMonth()]}–${MONTHS[e.getMonth()]} ${s.getFullYear()}`, qualifier);
    }
    return applyQualifier(`${MONTHS[s.getMonth()]} ${s.getFullYear()} – ${MONTHS[e.getMonth()]} ${e.getFullYear()}`, qualifier);
  }

  // Full date precision - use existing logic
  if (s.getFullYear() !== e.getFullYear()) {
    return applyQualifier(`${formatDateCore(s)} – ${formatDateCore(e)}`, qualifier);
  }

  if (s.getMonth() !== e.getMonth()) {
    return applyQualifier(`${MONTHS[s.getMonth()]} ${s.getDate()} – ${MONTHS[e.getMonth()]} ${e.getDate()}, ${s.getFullYear()}`, qualifier);
  }

  return applyQualifier(`${MONTHS[s.getMonth()]} ${s.getDate()}–${e.getDate()}, ${s.getFullYear()}`, qualifier);
}

// Helper to format a Date object without qualifier
function formatDateCore(d: Date): string {
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Helper to apply qualifier to a formatted string
function applyQualifier(formatted: string, qualifier: DateQualifier): string {
  switch (qualifier) {
    case "approximate":
      return `circa ${formatted}`;
    case "before":
      return `before ${formatted}`;
    case "after":
      return `after ${formatted}`;
    case "inferred":
      return `[${formatted}]`;
    case "exact":
    default:
      return formatted;
  }
}

/**
 * Extracts YYYY-MM-DD from various date formats for use in HTML date inputs.
 * Handles formats like "2003-01-01", "2003-01-01 00:00:00+00", ISO timestamps, etc.
 */
export function toDateInputValue(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  const match = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
  return match ? match[1] : "";
}

/**
 * Extract dateMeta from additionalMetadata object.
 * Returns undefined if no dateMeta present.
 */
export function getDateMeta(additionalMetadata: Record<string, unknown> | null | undefined): DateMeta | undefined {
  if (!additionalMetadata) return undefined;
  const dateMeta = additionalMetadata.dateMeta as DateMeta | undefined;
  if (!dateMeta) return undefined;
  // Only return if there's actual data
  if (dateMeta.startPrecision || dateMeta.endPrecision || dateMeta.qualifier) {
    return dateMeta;
  }
  return undefined;
}

/**
 * Combined date certainty options for simpler UX.
 * Each option maps to a precision + qualifier combination.
 */
export type DateCertainty =
  | "exact"
  | "approximate"
  | "year_only"
  | "year_approximate"
  | "month_only"
  | "month_approximate"
  | "before"
  | "after";

export const DATE_CERTAINTY_OPTIONS: { value: DateCertainty; label: string }[] = [
  { value: "exact", label: "Exact date" },
  { value: "approximate", label: "Approximate date" },
  { value: "year_only", label: "Only year known" },
  { value: "year_approximate", label: "Only year known (approximate)" },
  { value: "month_only", label: "Only month & year known" },
  { value: "month_approximate", label: "Only month & year (approximate)" },
  { value: "before", label: "Before this date" },
  { value: "after", label: "After this date" },
];

/**
 * Convert DateCertainty to precision + qualifier
 */
export function dateCertaintyToMeta(certainty: DateCertainty): { precision: DatePrecision; qualifier: DateQualifier } {
  switch (certainty) {
    case "exact":
      return { precision: "day", qualifier: "exact" };
    case "approximate":
      return { precision: "day", qualifier: "approximate" };
    case "year_only":
      return { precision: "year", qualifier: "exact" };
    case "year_approximate":
      return { precision: "year", qualifier: "approximate" };
    case "month_only":
      return { precision: "month", qualifier: "exact" };
    case "month_approximate":
      return { precision: "month", qualifier: "approximate" };
    case "before":
      return { precision: "day", qualifier: "before" };
    case "after":
      return { precision: "day", qualifier: "after" };
    default:
      return { precision: "day", qualifier: "exact" };
  }
}

/**
 * Convert precision + qualifier back to DateCertainty
 */
export function metaToDateCertainty(precision?: DatePrecision, qualifier?: DateQualifier): DateCertainty {
  const p = precision || "day";
  const q = qualifier || "exact";

  if (p === "year" && q === "exact") return "year_only";
  if (p === "year" && q === "approximate") return "year_approximate";
  if (p === "month" && q === "exact") return "month_only";
  if (p === "month" && q === "approximate") return "month_approximate";
  if (q === "approximate") return "approximate";
  if (q === "before") return "before";
  if (q === "after") return "after";
  return "exact";
}
