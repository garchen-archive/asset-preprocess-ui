"use client";

import { useState } from "react";

interface BackblazeLinkProps {
  fileKey: string;
  variant?: "icon" | "full";
  className?: string;
}

export function BackblazeLink({ fileKey, variant = "full", className = "" }: BackblazeLinkProps) {
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

  // Play icon
  const playIcon = (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z"/>
    </svg>
  );

  if (variant === "icon") {
    return (
      <button
        onClick={handleClick}
        disabled={loading}
        title="Play from Backblaze"
        className={`text-blue-600 hover:opacity-75 transition-opacity disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <svg className="w-6 h-6 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="12" cy="12" r="10" strokeWidth="2" strokeLinecap="round" strokeDasharray="32" strokeDashoffset="32" />
          </svg>
        ) : (
          <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
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
      {playIcon}
      {loading ? "Loading..." : "Play from Storage"}
    </button>
  );
}
