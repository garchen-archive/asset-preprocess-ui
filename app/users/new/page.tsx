import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

// User creation disabled - managed via CMS
export default async function NewUserPage() {
  redirect("/users");
}

/* Original new user page - disabled, user management moved to CMS
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { UserForm } from "@/components/user-form";

export default async function NewUserPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if ((session.user as any).role !== "admin") {
    redirect("/");
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <Link
          href="/users"
          className="text-sm text-muted-foreground hover:underline mb-2 inline-block"
        >
          &larr; Back to Users
        </Link>
        <h1 className="text-3xl font-bold">New User</h1>
        <p className="text-muted-foreground">
          Create a new user account
        </p>
      </div>

      <UserForm mode="create" cancelHref="/users" />
    </div>
  );
}
*/
