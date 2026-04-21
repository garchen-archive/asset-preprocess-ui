"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";

interface OptionItem {
  value: string;
  label: string;
}

interface AsyncSearchableSelectProps {
  searchEndpoint: string; // API endpoint to search
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  emptyLabel?: string;
  debounceMs?: number;
  minChars?: number;
  // For displaying the initially selected value
  initialOption?: OptionItem | null;
  // Transform API response to options
  transformResult?: (item: any) => OptionItem;
}

export function AsyncSearchableSelect({
  searchEndpoint,
  value: initialValue = "",
  onChange,
  name,
  placeholder = "Type to search...",
  disabled = false,
  emptyLabel = "None",
  debounceMs = 300,
  minChars = 2,
  initialOption = null,
  transformResult,
}: AsyncSearchableSelectProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const [selectedLabel, setSelectedLabel] = useState(initialOption?.label || "");
  const [options, setOptions] = useState<OptionItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Default transform function
  const defaultTransform = useCallback((item: any): OptionItem => ({
    value: item.id,
    label: `${item.title || item.name} (${item.fileFormat || item.assetType})`,
  }), []);

  const transform = transformResult || defaultTransform;

  // Fetch results with debouncing
  const fetchResults = useCallback(async (query: string) => {
    if (query.length < minChars) {
      setOptions([]);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${searchEndpoint}&q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setOptions(data.map(transform));
      }
    } catch (error) {
      console.error("Search error:", error);
      setOptions([]);
    } finally {
      setIsLoading(false);
    }
  }, [searchEndpoint, minChars, transform]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (search.length >= minChars) {
      debounceRef.current = setTimeout(() => {
        fetchResults(search);
      }, debounceMs);
    } else {
      setOptions([]);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [search, fetchResults, debounceMs, minChars]);

  // Update selected label when initialOption changes
  useEffect(() => {
    if (initialOption) {
      setSelectedLabel(initialOption.label);
    }
  }, [initialOption]);

  const handleSelect = (val: string, label?: string) => {
    setSelectedValue(val);
    setSelectedLabel(label || "");
    onChange?.(val);
    setSearch("");
    setIsOpen(false);
    setOptions([]);
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
          if (!disabled) {
            setIsOpen(true);
            setSearch("");
          }
        }}
        disabled={disabled}
        className="flex h-10 w-full rounded-md border border-input bg-background px-2 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50"
      />

      {name && <input type="hidden" name={name} value={selectedValue} />}

      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {/* Clear/None option */}
          <div
            className="px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm"
            onClick={() => handleSelect("", "")}
          >
            <span className="text-muted-foreground">{emptyLabel}</span>
          </div>

          {/* Loading state */}
          {isLoading && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Searching...
            </div>
          )}

          {/* Minimum characters hint */}
          {!isLoading && search.length > 0 && search.length < minChars && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              Type at least {minChars} characters to search
            </div>
          )}

          {/* No results */}
          {!isLoading && search.length >= minChars && options.length === 0 && (
            <div className="px-2 py-1.5 text-sm text-muted-foreground">
              No matches found
            </div>
          )}

          {/* Results */}
          {!isLoading && options.map((opt) => (
            <div
              key={opt.value}
              className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm ${
                selectedValue === opt.value ? "bg-accent" : ""
              }`}
              onClick={() => handleSelect(opt.value, opt.label)}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}

      {isOpen && !disabled && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => {
            setIsOpen(false);
            setSearch("");
          }}
        />
      )}
    </div>
  );
}
