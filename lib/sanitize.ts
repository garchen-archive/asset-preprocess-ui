import DOMPurify from "isomorphic-dompurify";

// Allow safe formatting tags but strip dangerous ones like <script>, <iframe>, etc.
const ALLOWED_TAGS = [
  "b",
  "i",
  "em",
  "strong",
  "a",
  "br",
  "p",
  "ul",
  "ol",
  "li",
  "span",
  "u",
  "s",
  "sub",
  "sup",
];

const ALLOWED_ATTR = ["href", "target", "rel", "class"];

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Allows safe formatting tags like <i>, <b>, <a> but strips
 * dangerous tags like <script>, <iframe>, event handlers, etc.
 */
export function sanitizeHtml(dirty: string | null | undefined): string | null {
  if (!dirty) return null;

  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Strip all tags not in allowlist rather than escaping them
    KEEP_CONTENT: true,
  });

  return clean || null;
}

/**
 * Sanitize plain text by stripping ALL HTML tags.
 * Use this for fields that should never contain HTML.
 */
export function stripHtml(dirty: string | null | undefined): string | null {
  if (!dirty) return null;

  const clean = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });

  return clean || null;
}
