"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function UserMenu() {
  const { data: session } = useSession();

  if (!session) {
    return null;
  }

  const isAdmin = (session.user as any)?.role === "admin";

  return (
    <div className="flex items-center gap-4">
      {isAdmin && (
        <Link href="/users" className="text-sm font-medium hover:underline">
          Users
        </Link>
      )}
      <div className="text-sm">
        <p className="font-medium">{session.user?.name}</p>
        <p className="text-muted-foreground text-xs">
          {(session.user as any)?.role || "user"}
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        Sign out
      </Button>
    </div>
  );
}
