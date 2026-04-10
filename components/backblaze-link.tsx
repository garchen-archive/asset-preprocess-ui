"use client";

import { useState } from "react";

interface BackblazeLinkProps {
  fileKey: string;
  variant?: "icon" | "full";
  label?: string;
  className?: string;
}

export function BackblazeLink({ fileKey, variant = "full", label, className = "" }: BackblazeLinkProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/storage/presign?key=${encodeURIComponent(fileKey)}&expires=7200&inline=true`);
      if (!response.ok) {
        throw new Error("Failed to get presigned URL");
      }
      const { url } = await response.json();
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Failed to open Backblaze file:", error);
      alert("Failed to open file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Determine icon based on file extension
  const isMedia = fileKey.match(/\.(mp4|webm|mov|mp3|wav|m4a)$/i);
  const defaultLabel = isMedia ? "Play from Storage" : "Open from Storage";

  // Icons with configurable size
  const getIcon = (size: string) => {
    if (isMedia) {
      return (
        <svg className={size} viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      );
    }
    return (
      <svg className={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/>
        <line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    );
  };

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        title={label || defaultLabel}
        className={`text-blue-600 hover:opacity-75 transition-opacity disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32" />
          </svg>
        ) : (
          getIcon("w-6 h-6")
        )}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={`text-blue-600 hover:underline inline-flex items-center gap-1 disabled:opacity-50 ${className}`}
    >
      {getIcon("w-4 h-4")}
      {loading ? "Loading..." : (label || defaultLabel)}
    </button>
  );
}
