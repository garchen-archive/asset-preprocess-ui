"use client";

import { useState, useMemo } from "react";

interface TypeaheadOption {
  id: string;
  name: string;
}

interface InlineTypeaheadProps {
  options: TypeaheadOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function InlineTypeahead({
  options,
  value,
  onChange,
  placeholder = "",
  className = "",
}: InlineTypeaheadProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const filteredOptions = useMemo(() => {
    const query = (isOpen ? search : value).toLowerCase();
    if (!query) return options;
    return options.filter((opt) => opt.name.toLowerCase().includes(query));
  }, [options, search, value, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    onChange(val);
    if (!isOpen) setIsOpen(true);
  };

  const handleSelect = (optionName: string) => {
    onChange(optionName);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        value={isOpen ? search || value : value}
        onChange={handleInputChange}
        onFocus={() => setIsOpen(true)}
        className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        autoComplete="off"
      />

      {isOpen && filteredOptions.length > 0 && (
        <div className="absolute z-50 mt-1 max-h-48 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md">
          {filteredOptions.slice(0, 8).map((opt) => (
            <div
              key={opt.id}
              className={`px-2 py-1.5 text-sm cursor-pointer hover:bg-accent rounded-sm ${
                value === opt.name ? "bg-accent" : ""
              }`}
              onClick={() => handleSelect(opt.name)}
            >
              {opt.name}
            </div>
          ))}
        </div>
      )}

      {isOpen && (
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
