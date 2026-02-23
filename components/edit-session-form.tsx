"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MultiSelectWithCreate } from "@/components/multi-select-with-create";
import { updateSession } from "@/lib/actions";
import { toDateInputValue } from "@/lib/utils";
import type { Session, Event, Topic, Category, Location } from "@/lib/db/schema";

interface EditSessionFormProps {
  session: Session;
  eventsList: Event[];
  sessionEvent: Event | null;
  location: Location | null;
  allTopics: Topic[];
  allCategories: Category[];
  selectedTopicIds: string[];
  selectedCategoryIds: string[];
}

export function EditSessionForm({
  session,
  eventsList,
  sessionEvent,
  location,
  allTopics,
  allCategories,
  selectedTopicIds: initialTopicIds,
  selectedCategoryIds: initialCategoryIds,
}: EditSessionFormProps) {
  const [selectedTopicIds, setSelectedTopicIds] = useState<string[]>(initialTopicIds);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>(initialCategoryIds);

  // Controlled state for date field
  const [sessionDate, setSessionDate] = useState(toDateInputValue(session.sessionDate));

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/sessions/${session.id}`}
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          ← Back to Session
        </Link>
        <h1 className="text-3xl font-bold">Edit Session</h1>
        <p className="text-muted-foreground">{session.sessionName}</p>
      </div>

      <form action={updateSession.bind(null, session.id)} className="space-y-8">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="sessionName">Session Name *</Label>
              <Input
                id="sessionName"
                name="sessionName"
                required
                defaultValue={session.sessionName}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="eventId">Event *</Label>
              <select
                id="eventId"
                name="eventId"
                defaultValue={session.eventId || ""}
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
              <Input
                id="sessionDate"
                name="sessionDate"
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="sessionTime">Session Time</Label>
              <Input
                id="sessionTime"
                name="sessionTime"
                type="time"
                defaultValue={session.sessionTime || ""}
              />
            </div>

            <div>
              <Label htmlFor="sessionStartTime">Start Time</Label>
              <Input
                id="sessionStartTime"
                name="sessionStartTime"
                type="time"
                defaultValue={session.sessionStartTime || ""}
              />
            </div>

            <div>
              <Label htmlFor="sessionEndTime">End Time</Label>
              <Input
                id="sessionEndTime"
                name="sessionEndTime"
                type="time"
                defaultValue={session.sessionEndTime || ""}
              />
            </div>

            <div>
              <Label htmlFor="sequenceInEvent">Sequence in Event</Label>
              <Input
                id="sequenceInEvent"
                name="sequenceInEvent"
                type="number"
                defaultValue={session.sequenceInEvent || ""}
              />
            </div>

            <div>
              <Label htmlFor="durationEstimated">Duration (Estimated)</Label>
              <Input
                id="durationEstimated"
                name="durationEstimated"
                defaultValue={session.durationEstimated || ""}
                placeholder="e.g., 01:30:00"
              />
            </div>

            <div>
              <Label htmlFor="catalogingStatus">Cataloging Status</Label>
              <select
                id="catalogingStatus"
                name="catalogingStatus"
                defaultValue={session.catalogingStatus || ""}
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
                defaultValue={session.sessionDescription || ""}
                rows={4}
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                name="notes"
                defaultValue={session.notes || ""}
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Location (Inherited from Event) */}
        {sessionEvent && (
          <div className="rounded-lg border p-6 bg-muted/30">
            <h2 className="text-xl font-semibold mb-2">Location</h2>
            <p className="text-xs text-muted-foreground italic mb-4">
              Inherited from event: <Link href={`/events/${sessionEvent.id}`} className="text-blue-600 hover:underline">{sessionEvent.eventName}</Link>
            </p>
            {location ? (
              <div className="p-4 rounded-md bg-green-50/50 border border-green-200">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium mb-1">
                      <Link href={`/locations/${location.id}`} className="text-blue-600 hover:underline">
                        {location.name}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground font-mono">{location.code}</p>
                    {location.isOnline && (
                      <p className="text-xs text-muted-foreground mt-1">Online</p>
                    )}
                  </div>
                  {location.locationType && (
                    <Badge variant="secondary" className="text-xs">
                      {location.locationType}
                    </Badge>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No location assigned to parent event.
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" asChild>
            <Link href={`/sessions/${session.id}`}>Cancel</Link>
          </Button>
          <Button type="submit">Save Changes</Button>
        </div>
      </form>
    </div>
  );
}
