import { db } from "@/lib/db/client";
import { organizations, locations, organizationLocations, locationAddresses, addresses } from "@/lib/db/schema";
import { eq, isNull } from "drizzle-orm";
import { linkLocationToOrganization } from "@/lib/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function LinkLocationPage({
  params,
}: {
  params: { id: string };
}) {
  const [organization] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, params.id))
    .limit(1);

  if (!organization) {
    notFound();
  }

  // Get all locations with their primary address info
  const allLocations = await db
    .select({
      id: locations.id,
      code: locations.code,
      name: locations.name,
      locationType: locations.locationType,
      isOnline: locations.isOnline,
      city: addresses.city,
      country: addresses.country,
    })
    .from(locations)
    .leftJoin(locationAddresses, eq(locationAddresses.locationId, locations.id))
    .leftJoin(addresses, eq(locationAddresses.addressId, addresses.id))
    .where(isNull(locations.deletedAt));

  // Get already linked location IDs
  const alreadyLinked = await db
    .select({ locationId: organizationLocations.locationId })
    .from(organizationLocations)
    .where(eq(organizationLocations.organizationId, params.id));

  const linkedIds = new Set(alreadyLinked.map((l) => l.locationId));
  const availableLocations = allLocations.filter((l) => !linkedIds.has(l.id));

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Orgs", href: "/organizations" },
    { label: organization.name, href: `/organizations/${params.id}` },
    { label: "Link Location" },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div>
        <h1 className="text-3xl font-bold">Link Location</h1>
        <p className="text-muted-foreground">
          Link an existing location to {organization.name}
        </p>
      </div>

      <form action={linkLocationToOrganization.bind(null, params.id)} className="space-y-6">
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Select Location</h2>
          <div className="space-y-4">
            <div>
              <Label htmlFor="locationId">Location *</Label>
              <select
                id="locationId"
                name="locationId"
                required
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Select a location...</option>
                {availableLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                    {loc.city || loc.country ? ` — ${[loc.city, loc.country].filter(Boolean).join(", ")}` : ""}
                    {loc.isOnline ? " (Online)" : ""}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Don&apos;t see the location you need?{" "}
                <Link href="/locations/new" className="text-blue-600 hover:underline">
                  Create a new one
                </Link>
              </p>
            </div>

            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                name="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">No specific role</option>
                <option value="HQ">HQ (Headquarters)</option>
                <option value="branch">Branch</option>
                <option value="temporary">Temporary</option>
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                What role does this location serve for the organization?
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="isPrimary"
                name="isPrimary"
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPrimary" className="mb-0">Primary location for this organization</Label>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <Button type="submit">Link Location</Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/organizations/${params.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
