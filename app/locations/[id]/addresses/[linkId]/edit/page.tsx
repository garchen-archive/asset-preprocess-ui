import { db } from "@/lib/db/client";
import { locations, addresses, locationAddresses } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { updateAddressAndLink } from "@/lib/actions";
import { toDateInputValue } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Breadcrumbs, BreadcrumbItem } from "@/components/breadcrumbs";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EditLocationAddressPage({
  params,
}: {
  params: { id: string; linkId: string };
}) {
  const [location] = await db
    .select()
    .from(locations)
    .where(eq(locations.id, params.id))
    .limit(1);

  if (!location) {
    notFound();
  }

  // Get the link record with the address details
  const [link] = await db
    .select({
      linkId: locationAddresses.id,
      isPrimary: locationAddresses.isPrimary,
      effectiveFrom: locationAddresses.effectiveFrom,
      effectiveTo: locationAddresses.effectiveTo,
      addressId: addresses.id,
      label: addresses.label,
      fullAddress: addresses.fullAddress,
      city: addresses.city,
      stateProvince: addresses.stateProvince,
      country: addresses.country,
      postalCode: addresses.postalCode,
      latitude: addresses.latitude,
      longitude: addresses.longitude,
      notes: addresses.notes,
    })
    .from(locationAddresses)
    .innerJoin(addresses, eq(locationAddresses.addressId, addresses.id))
    .where(eq(locationAddresses.id, params.linkId))
    .limit(1);

  if (!link) {
    notFound();
  }

  const addressDisplay = link.label || link.fullAddress || [link.city, link.country].filter(Boolean).join(", ") || "Address";

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: "Locations", href: "/locations" },
    { label: location.name, href: `/locations/${params.id}` },
    { label: `Edit: ${addressDisplay}` },
  ];

  return (
    <div className="space-y-6">
      <Breadcrumbs items={breadcrumbItems} />

      <div>
        <h1 className="text-3xl font-bold">Edit Address</h1>
        <p className="text-muted-foreground">
          Edit address details and link settings for {location.name}
        </p>
      </div>

      <form
        action={updateAddressAndLink.bind(null, link.addressId, params.linkId, params.id)}
        className="space-y-6"
      >
        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Address Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="label">Label</Label>
              <Input
                id="label"
                name="label"
                defaultValue={link.label || ""}
                placeholder='e.g., "Main Center", "Retreat Land"'
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="fullAddress">Full Address</Label>
              <Input
                id="fullAddress"
                name="fullAddress"
                defaultValue={link.fullAddress || ""}
                placeholder="Complete address"
              />
            </div>

            <div>
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" defaultValue={link.city || ""} placeholder="City" />
            </div>

            <div>
              <Label htmlFor="stateProvince">State/Province</Label>
              <Input id="stateProvince" name="stateProvince" defaultValue={link.stateProvince || ""} placeholder="State or Province" />
            </div>

            <div>
              <Label htmlFor="country">Country</Label>
              <Input id="country" name="country" defaultValue={link.country || ""} placeholder="Country" />
            </div>

            <div>
              <Label htmlFor="postalCode">Postal Code</Label>
              <Input id="postalCode" name="postalCode" defaultValue={link.postalCode || ""} placeholder="Postal/ZIP code" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Geographic Coordinates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="latitude">Latitude</Label>
              <Input id="latitude" name="latitude" type="number" step="any" defaultValue={link.latitude ?? ""} placeholder="e.g., 41.8781" />
            </div>
            <div>
              <Label htmlFor="longitude">Longitude</Label>
              <Input id="longitude" name="longitude" type="number" step="any" defaultValue={link.longitude ?? ""} placeholder="e.g., -87.6298" />
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Link Settings</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="effectiveFrom">Effective From</Label>
              <Input
                id="effectiveFrom"
                name="effectiveFrom"
                type="date"
                defaultValue={toDateInputValue(link.effectiveFrom)}
              />
            </div>
            <div>
              <Label htmlFor="effectiveTo">Effective To</Label>
              <Input
                id="effectiveTo"
                name="effectiveTo"
                type="date"
                defaultValue={toDateInputValue(link.effectiveTo)}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave blank if this is the current address
              </p>
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input
                id="isPrimary"
                name="isPrimary"
                type="checkbox"
                defaultChecked={link.isPrimary ?? false}
                className="h-4 w-4 rounded border-gray-300"
              />
              <Label htmlFor="isPrimary" className="mb-0">Primary address for this location</Label>
            </div>
          </div>
        </div>

        <div className="rounded-lg border p-6">
          <h2 className="text-xl font-semibold mb-4">Notes</h2>
          <Textarea id="notes" name="notes" defaultValue={link.notes || ""} placeholder="Additional notes about this address" rows={3} />
        </div>

        <div className="flex gap-4">
          <Button type="submit">Save Changes</Button>
          <Button type="button" variant="outline" asChild>
            <Link href={`/locations/${params.id}`}>Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
