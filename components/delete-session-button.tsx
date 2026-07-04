"use client";

import { Button } from "@/components/ui/button";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface DeleteSessionButtonProps {
  id: string;
  sessionName: string;
  assetCount?: number;
}

export function DeleteSessionButton({ id, sessionName, assetCount = 0 }: DeleteSessionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [deleteMode, setDeleteMode] = useState<"soft" | "hard">("soft");
  const router = useRouter();

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      try {
        const params = new URLSearchParams();

        if (deleteMode === "hard") {
          params.set("hard", "true");
        }

        const queryString = params.toString();
        const response = await fetch(`/api/pipeline`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: `/api/v1/admin/sessions/${id}${queryString ? `?${queryString}` : ""}`,
            method: "DELETE",
          }),
        });

        const data = await response.json();

        if (!response.ok || data.status >= 400) {
          const errorMessage = data.message || data.error || data.data?.message || data.data?.error || JSON.stringify(data);
          throw new Error(errorMessage);
        }

        if (deleteMode === "soft") {
          router.refresh();
        } else {
          router.push("/sessions");
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || "Failed to delete session");
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
          size="sm"
          onClick={() => setShowConfirm(true)}
        >
          Delete Session
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4 border border-destructive/50 rounded-lg bg-destructive/5">
      <p className="text-sm font-medium">Delete "{sessionName}"?</p>

      {assetCount > 0 && (
        <div className="p-2 bg-amber-50 border border-amber-200 rounded text-sm">
          <p className="text-amber-800">
            This session has {assetCount} linked asset{assetCount > 1 ? "s" : ""}.
          </p>
        </div>
      )}

      {/* Delete mode selection */}
      <div className="space-y-1">
        <label className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted/50 has-[:checked]:border-amber-400 has-[:checked]:bg-amber-50">
          <input
            type="radio"
            name="deleteMode"
            value="soft"
            checked={deleteMode === "soft"}
            onChange={() => setDeleteMode("soft")}
            className="mt-0.5"
          />
          <div>
            <span className="font-medium">Soft delete</span>
            <p className="text-xs text-muted-foreground">Mark as deleted. Can be restored later.</p>
          </div>
        </label>
        <label className="flex items-start gap-2 text-sm cursor-pointer p-2 rounded border hover:bg-muted/50 has-[:checked]:border-destructive has-[:checked]:bg-destructive/10">
          <input
            type="radio"
            name="deleteMode"
            value="hard"
            checked={deleteMode === "hard"}
            onChange={() => setDeleteMode("hard")}
            className="mt-0.5"
          />
          <div>
            <span className="font-medium text-destructive">Permanent delete</span>
            <p className="text-xs text-muted-foreground">Permanently remove from database. Cannot be undone.</p>
          </div>
        </label>
      </div>

      <div className="flex gap-2 pt-2">
        <Button
          type="button"
          variant={deleteMode === "hard" ? "destructive" : "default"}
          size="sm"
          onClick={handleDelete}
          disabled={isPending}
        >
          {isPending ? "Deleting..." : deleteMode === "hard" ? "Permanently Delete" : "Soft Delete"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setShowConfirm(false);
            setDeleteMode("soft");
          }}
          disabled={isPending}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
