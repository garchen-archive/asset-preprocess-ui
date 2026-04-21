"use client";

import { useState, useMemo } from "react";

interface OptionItem {
  value: string;
  label: string;
  searchTerms?: string; // Additional terms to search against (e.g., filename, description)
}

interface SearchableSelectProps {
  options: string[] | OptionItem[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
}

export function SearchableSelect({
  options,
  value: initialValue = "",
  onChange,
  name,
  placeholder = "Search...",
  disabled = false,
  emptyLabel = "All",
}: SearchableSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(initialValue);

  // Normalize options to OptionItem format
  const normalizedOptions: OptionItem[] = useMemo(() => {
    if (options.length === 0) return [];
    if (typeof options[0] === "string") {
      return (options as string[]).map((opt) => ({ value: opt, label: opt }));
    }
    return options as OptionItem[];
  }, [options]);

  const filteredOptions = useMemo(() => {
    if (!search) return normalizedOptions;
    const searchLower = search.toLowerCase();
    return normalizedOptions.filter((opt) =>
      opt.label.toLowerCase().includes(searchLower) ||
      (opt.searchTerms && opt.searchTerms.toLowerCase().includes(searchLower))
    );
  }, [normalizedOptions, search]);

  // Get the display label for the selected value
  const selectedLabel = useMemo(() => {
    if (!selectedValue) return "";
    const found = normalizedOptions.find((opt) => opt.value === selectedValue);
    return found ? found.label : selectedValue;
  }, [selectedValue, normalizedOptions]);

  const handleSelect = (val: string) => {
    setSelectedValue(val);
    onChange?.(val);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? search : selectedLabel}
        onChange={(e) => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setIsOpen(true);
        }}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      />

      {name && <input type="hidden" name={name} value={selectedValue} />}

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          <div
            className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
            onClick={() => handleSelect("")}
          >
            <span className="text-muted-foreground">{emptyLabel}</span>
          </div>
          {filteredOptions.length === 0 ? (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No matches
            </div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm ${
                  selectedValue === opt.value ? "bg-accent" : ""
                }`}
                onClick={() => handleSelect(opt.value)}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}

      {isOpen && !disabled && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
