"use client";

import { Button } from "@/components/ui/button";
import { deleteAsset } from "@/lib/actions";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteAssetButton({ id }: { id: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        await deleteAsset(id);
        router.push("/assets");
        router.refresh();
      } catch (err: any) {
        setError(err.message || "Failed to delete asset");
        setShowConfirm(false);
      }
    });
  };

  if (!showConfirm) {
    return (
      <div className="space-y-2">
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
        <Button
          type="button"
          variant="destructive"
          onClick={() => setShowConfirm(true)}
        >
          Delete Asset
        </Button>
      </div>
    );
  }

  return (
    <div className="flex gap-2 items-center">
      <span className="text-sm text-destructive font-medium">Are you sure?</span>
      <Button
        type="button"
        variant="destructive"
        size="sm"
        onClick={handleDelete}
        disabled={isPending}
      >
        {isPending ? "Deleting..." : "Yes, Delete"}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(false)}
        disabled={isPending}
      >
        Cancel
      </Button>
    </div>
  );
}
