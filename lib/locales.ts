// Central configuration for supported locales/languages
// Used across the application for consistency

export interface LocaleOption {
  value: string;
  label: string;
  /** Native name of the language (optional) */
  nativeName?: string;
}

/**
 * Supported locales in the archive.
 * Add new languages here to make them available throughout the application.
 */
export const SUPPORTED_LOCALES: LocaleOption[] = [
  { value: "en", label: "English", nativeName: "English" },
  { value: "bo", label: "Tibetan", nativeName: "བོད་སྐད་" },
  { value: "zh", label: "Chinese", nativeName: "中文" },
  { value: "de", label: "German", nativeName: "Deutsch" },
  { value: "es", label: "Spanish", nativeName: "Español" },
  { value: "fr", label: "French", nativeName: "Français" },
  { value: "pt", label: "Portuguese", nativeName: "Português" },
  { value: "ru", label: "Russian", nativeName: "Русский" },
  { value: "vi", label: "Vietnamese", nativeName: "Tiếng Việt" },
  { value: "id", label: "Indonesian", nativeName: "Bahasa Indonesia" },
];

/**
 * Get the label for a locale code
 */
export function getLocaleLabel(code: string | null | undefined): string | undefined {
  if (!code) return undefined;
  return SUPPORTED_LOCALES.find((l) => l.value === code)?.label;
}

/**
 * Get locale option by code
 */
export function getLocale(code: string): LocaleOption | undefined {
  return SUPPORTED_LOCALES.find((l) => l.value === code);
}
