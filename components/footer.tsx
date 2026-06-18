"use client";

import { getVersionString } from "@/lib/version";

export function Footer() {
  return (
    <footer className="border-t mt-auto">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Garchen Archive</span>
          <span>{getVersionString()}</span>
        </div>
      </div>
    </footer>
  );
}
