import { db } from "@/lib/db/client";
import { users, credentials } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { UserForm } from "@/components/user-form";

export const dynamic = "force-dynamic";

export default async function EditUserPage({
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

  // Fetch user with credentials
  const [userData] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      username: credentials.username,
    })
    .from(users)
    .leftJoin(credentials, eq(users.id, credentials.userId))
    .where(eq(users.id, params.id))
    .limit(1);

  if (!userData) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <Link
          href={`/users/${params.id}`}
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          &larr; Back to User
        </Link>
        <h1 className="text-3xl font-bold">Edit User</h1>
        <p className="text-muted-foreground">
          Update user information for {userData.name}
        </p>
      </div>

      {/* Form */}
      <UserForm
        mode="edit"
        user={userData}
        cancelHref={`/users/${params.id}`}
      />
    </div>
  );
}
