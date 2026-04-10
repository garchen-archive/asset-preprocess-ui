"use client";

import { Button } from "@/components/ui/button";
import { deleteTranscript } from "@/lib/actions";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DeleteTranscriptButton({ id }: { id: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const handleDelete = () => {
    startTransition(async () => {
      await deleteTranscript(id);
      router.push("/transcripts");
      router.refresh();
    });
  };

  if (!showConfirm) {
    return (
      <Button
        type="button"
        variant="destructive"
        onClick={() => setShowConfirm(true)}
      >
        Delete
      </Button>
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
