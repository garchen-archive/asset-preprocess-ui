import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { DeleteUserButton } from "@/components/delete-user-button";

export const dynamic = "force-dynamic";

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  // Check admin access
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if ((session.user as any).role !== "admin") {
    redirect("/");
  }

  // Fetch user (go-auth schema)
  const [userData] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      username: users.username,
      userRole: users.userRole,
      status: users.status,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(eq(users.id, params.id))
    .limit(1);

  if (!userData) {
    notFound();
  }

  const displayName = `${userData.firstName} ${userData.lastName}`;
  const isCurrentUser = (session.user as any).id === userData.id;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href="/users"
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          &larr; Back to Users
        </Link>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">{displayName}</h1>
            <p className="text-muted-foreground">@{userData.username}</p>
          </div>
          {/* Edit/Delete disabled - managed via CMS
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/users/${params.id}/edit`}>Edit</Link>
            </Button>
            {!isCurrentUser && (
              <DeleteUserButton userId={params.id} userName={displayName} />
            )}
          </div>
          */}
        </div>
      </div>

      {/* User Details */}
      <div className="rounded-lg border p-6 space-y-4">
        <h2 className="text-xl font-semibold">User Details</h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">First Name</p>
            <p className="font-medium">{userData.firstName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Name</p>
            <p className="font-medium">{userData.lastName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Username</p>
            <p className="font-medium">{userData.username}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{userData.email || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Role</p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                userData.userRole === "admin"
                  ? "bg-red-100 text-red-700"
                  : userData.userRole === "member"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {userData.userRole}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <span
              className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                userData.status === "active"
                  ? "bg-green-100 text-green-700"
                  : userData.status === "suspended"
                  ? "bg-yellow-100 text-yellow-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {userData.status}
            </span>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created</p>
            <p className="font-medium">
              {new Date(userData.createdAt).toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(userData.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>

        {isCurrentUser && (
          <p className="text-sm text-amber-600 mt-4">
            This is your account. You cannot delete your own account.
          </p>
        )}
      </div>
    </div>
  );
}
