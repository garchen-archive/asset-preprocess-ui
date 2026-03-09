"use client";

import { useState, useRef, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface FilterMultiSelectProps {
  name: string;
  label: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  placeholder?: string;
  compact?: boolean;
}

export function FilterMultiSelect({
  name,
  label,
  options,
  selectedValues,
  placeholder = "Select...",
  compact = false,
}: FilterMultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState<string[]>(selectedValues);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state with prop changes (e.g., when filters are cleared)
  useEffect(() => {
    setSelected(selectedValues);
  }, [selectedValues]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const toggleOption = (value: string) => {
    setSelected(prev =>
      prev.includes(value)
        ? prev.filter(v => v !== value)
        : [...prev, value]
    );
  };

  const removeOption = (value: string) => {
    setSelected(prev => prev.filter(v => v !== value));
  };

  const selectedLabels = options.filter(opt => selected.includes(opt.value));

  return (
    <div className="space-y-1.5" ref={dropdownRef}>
      <label className={`font-medium block ${compact ? "text-xs mb-1" : "text-sm"}`}>{label}</label>

      {/* Dropdown trigger */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center justify-between w-full h-10 px-3 py-2 text-sm border rounded-md bg-background hover:bg-muted/50"
        >
          <span className="text-muted-foreground">
            {selected.length === 0 ? placeholder : `${selected.length} selected`}
          </span>
          <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center px-3 py-2 hover:bg-muted/50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(option.value)}
                  onChange={() => toggleOption(option.value)}
                  className="h-4 w-4 rounded border-gray-300 mr-2"
                />
                <span className="text-sm">{option.label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Selected chips */}
      {selectedLabels.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedLabels.map((item) => (
            <Badge key={item.value} variant="secondary" className="gap-1 text-xs">
              {item.label}
              <button
                type="button"
                onClick={() => removeOption(item.value)}
                className="ml-0.5 hover:bg-muted rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* Hidden inputs for form submission */}
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  );
}
