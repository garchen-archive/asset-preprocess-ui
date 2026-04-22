import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UserForm } from "@/components/user-form";

export const dynamic = "force-dynamic";

export default async function NewUserPage() {
  // Check admin access
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    redirect("/login");
  }
  if ((session.user as any).role !== "admin") {
    redirect("/");
  }

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
        <h1 className="text-3xl font-bold">New User</h1>
        <p className="text-muted-foreground">
          Create a new user account
        </p>
      </div>

      {/* Form */}
      <UserForm mode="create" cancelHref="/users" />
    </div>
  );
}
