import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// User editing disabled - managed via CMS
export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  // Redirect to user detail page
  redirect(`/users/${params.id}`);
}

/* Original edit page - disabled, user management moved to CMS
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { UserForm } from "@/components/user-form";

export default async function EditUserPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if ((session.user as any).role !== "admin") {
    redirect("/");
  }

  const [userData] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      username: users.username,
      userRole: users.userRole,
      status: users.status,
    })
    .from(users)
    .where(eq(users.id, params.id))
    .limit(1);

  if (!userData) {
    notFound();
  }

  const displayName = `${userData.firstName} ${userData.lastName}`;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href={`/users/${params.id}`}
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          &larr; Back to User
        </Link>
        <h1 className="text-3xl font-bold">Edit User</h1>
        <p className="text-muted-foreground">
          Update user information for {displayName}
        </p>
      </div>

      <UserForm
        mode="edit"
        user={userData}
        cancelHref={`/users/${params.id}`}
      />
    </div>
  );
}
*/
