import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  // Check admin access
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if ((session.user as any).role !== "admin") {
    redirect("/");
  }

  // Fetch all users (go-auth schema)
  const userList = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      username: users.username,
      userRole: users.userRole,
      status: users.status,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(users.lastName);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Users</h1>
          <p className="text-muted-foreground">
            User accounts (managed via CMS)
          </p>
        </div>
        {/* User management disabled - handled by CMS
        <Button asChild>
          <Link href="/users/new">Add User</Link>
        </Button>
        */}
      </div>

      {/* Users Table */}
      <div className="rounded-lg border">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Username</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Role</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium">Created</th>
              <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {userList.map((user) => (
              <tr key={user.id} className="hover:bg-muted/30">
                <td className="px-4 py-3">
                  <Link
                    href={`/users/${user.id}`}
                    className="font-medium hover:underline"
                  >
                    {user.firstName} {user.lastName}
                  </Link>
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.username}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {user.email || "-"}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      user.userRole === "admin"
                        ? "bg-red-100 text-red-700"
                        : user.userRole === "member"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user.userRole}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                      user.status === "active"
                        ? "bg-green-100 text-green-700"
                        : user.status === "suspended"
                        ? "bg-yellow-100 text-yellow-700"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {user.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                {/* Edit disabled - managed via CMS
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/users/${user.id}/edit`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Edit
                  </Link>
                </td>
                */}
                <td className="px-4 py-3 text-right text-muted-foreground text-sm">
                  View only
                </td>
              </tr>
            ))}
            {userList.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No users found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
