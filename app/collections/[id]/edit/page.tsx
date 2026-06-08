import { db } from "@/lib/db/client";
import { collection, event } from "@/lib/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

async function updateCollection(id: string, formData: FormData) {
  "use server";

  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const visibility = formData.get("visibility") as string;
  const isDefault = formData.get("isDefault") === "on";

  await db
    .update(collection)
    .set({
      name,
      description: description || null,
      visibility,
      isDefault,
      updatedAt: new Date(),
    })
    .where(eq(collection.id, id));

  revalidatePath(`/collections/${id}`);
  redirect(`/collections/${id}`);
}

async function deleteCollection(id: string) {
  "use server";

  // Soft delete
  await db
    .update(collection)
    .set({
      deletedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(collection.id, id));

  revalidatePath("/collections");
  redirect("/collections");
}

export default async function EditCollectionPage({
  params,
}: {
  params: { id: string };
}) {
  const [collectionData] = await db
    .select({
      collection: collection,
      eventName: event.eventName,
    })
    .from(collection)
    .leftJoin(event, eq(event.id, collection.eventId))
    .where(and(eq(collection.id, params.id), isNull(collection.deletedAt)));

  if (!collectionData) {
    notFound();
  }

  const { collection: c, eventName } = collectionData;

  return (
    <div className="space-y-6 max-w-2xl">
      <Breadcrumbs
        items={[
          { label: "Collections", href: "/collections" },
          { label: c.name, href: `/collections/${c.id}` },
          { label: "Edit" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold">Edit Collection</h1>
        <p className="text-muted-foreground mt-1">
          Update collection details
        </p>
      </div>

      <form action={updateCollection.bind(null, params.id)} className="space-y-6">
        <div className="rounded-lg border p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={c.name}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={c.description || ""}
              rows={3}
              className="w-full px-3 py-2 border rounded-md resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="visibility">Visibility</Label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={c.visibility}
              className="w-full px-3 py-2 border rounded-md"
            >
              <option value="private">Private</option>
              <option value="shared">Shared</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isDefault"
              name="isDefault"
              defaultChecked={c.isDefault}
              className="h-4 w-4"
            />
            <Label htmlFor="isDefault" className="font-normal">
              Default collection for this event
            </Label>
          </div>

          {/* Read-only fields */}
          <div className="pt-4 border-t space-y-3">
            <div>
              <Label className="text-muted-foreground">Scope</Label>
              <p className="text-sm">{c.scope}</p>
            </div>
            {c.eventId && (
              <div>
                <Label className="text-muted-foreground">Event</Label>
                <p className="text-sm">
                  <Link href={`/events/${c.eventId}`} className="text-primary hover:underline">
                    {eventName || c.eventId}
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="submit">Save Changes</Button>
          <Button variant="outline" asChild>
            <Link href={`/collections/${params.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>

      {/* Danger Zone */}
      <div className="rounded-lg border border-destructive/50 p-6">
        <h2 className="text-lg font-semibold text-destructive mb-2">Danger Zone</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Deleting this collection will also remove all its items.
        </p>
        <form action={deleteCollection.bind(null, params.id)}>
          <Button type="submit" variant="destructive" size="sm">
            Delete Collection
          </Button>
        </form>
      </div>
    </div>
  );
}
