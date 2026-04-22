"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { deleteUser } from "@/lib/actions";

interface DeleteUserButtonProps {
  userId: string;
  userName: string;
}

export function DeleteUserButton({ userId, userName }: DeleteUserButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    const result = await deleteUser(userId);
    if (result?.error) {
      setError(result.error);
      setIsDeleting(false);
      setIsConfirming(false);
    }
    // If successful, the action will redirect
  };

  if (isConfirming) {
    return (
      <div className="flex items-center gap-2">
        {error && <span className="text-sm text-red-600">{error}</span>}
        <span className="text-sm text-muted-foreground">Delete {userName}?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          {isDeleting ? "Deleting..." : "Confirm"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsConfirming(false)}
          disabled={isDeleting}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <Button variant="destructive" onClick={() => setIsConfirming(true)}>
      Delete
    </Button>
  );
}
