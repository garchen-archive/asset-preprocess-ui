"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { MultiSelectWithCreate } from "@/components/multi-select-with-create";
import { createSession } from "@/lib/actions";
import type { Event, Topic, Category } from "@/lib/db/schema";

interface NewSessionFormProps {
  eventsList: Event[];
  defaultEventId?: string;
  allTopics: Topic[];
  allCategories: Category[];
}

export function NewSessionForm({ eventsList, defaultEventId, allTopics, allCategories }: NewSessionFormProps) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/sessions"
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          ← Back to Sessions
        </Link>
        <h1 className="text-3xl font-bold">Create New Session</h1>
      </div>

      <form action={createSession} className="space-y-8">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="sessionName">Session Name *</Label>
              <Input
                id="sessionName"
                name="sessionName"
                required
                placeholder="e.g., Introduction to Bodhichitta"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="eventId">Event *</Label>
              <select
                id="eventId"
                name="eventId"
                defaultValue={defaultEventId || ""}
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select Event</option>
                {eventsList.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.eventName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="sessionDate">Session Date</Label>
              <Input id="sessionDate" name="sessionDate" type="date" />
            </div>

            <div>
              <Label htmlFor="sessionTime">Session Time</Label>
              <Input id="sessionTime" name="sessionTime" type="time" />
            </div>

            <div>
              <Label htmlFor="sessionStartTime">Start Time</Label>
              <Input id="sessionStartTime" name="sessionStartTime" type="time" />
              <p className="text-xs text-muted-foreground mt-1">Optional: Specific start time</p>
            </div>

            <div>
              <Label htmlFor="sessionEndTime">End Time</Label>
              <Input id="sessionEndTime" name="sessionEndTime" type="time" />
              <p className="text-xs text-muted-foreground mt-1">Optional: Specific end time</p>
            </div>

            <div>
              <Label htmlFor="durationEstimated">Duration (Estimated)</Label>
              <Input
                id="durationEstimated"
                name="durationEstimated"
                placeholder="e.g., 01:30:00"
              />
            </div>

            <div>
              <Label htmlFor="catalogingStatus">Cataloging Status</Label>
              <select
                id="catalogingStatus"
                name="catalogingStatus"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Not Started</option>
                <option value="In Progress">In Progress</option>
                <option value="Ready">Ready</option>
                <option value="Needs Review">Needs Review</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <MultiSelectWithCreate
                name="categoryIds"
                label="Categories"
                availableItems={allCategories}
                selectedIds={selectedCategoryIds}
                onSelectionChange={setSelectedCategoryIds}
              />
            </div>

            <div className="md:col-span-2">
              <MultiSelectWithCreate
                name="topicIds"
                label="Topics"
                availableItems={allTopics}
                selectedIds={selectedTopicIds}
                onSelectionChange={setSelectedTopicIds}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="sessionDescription">Description</Label>
              <Textarea
                id="sessionDescription"
                name="sessionDescription"
                placeholder="Session description"
                rows={4}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                placeholder="Additional notes"
                rows={3}
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href="/sessions">Cancel</Link>
          </Button>
          <Button type="submit">Create Session</Button>
        </div>
      </form>
    </div>
  );
}
