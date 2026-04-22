"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createUser, updateUser } from "@/lib/actions";

const ROLE_OPTIONS = [
  { value: "viewer", label: "Viewer", description: "Can view content only" },
  { value: "editor", label: "Editor", description: "Can view and edit content" },
  { value: "admin", label: "Admin", description: "Full access including user management" },
];

type UserData = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  username: string | null;
};

interface UserFormProps {
  mode: "create" | "edit";
  user?: UserData;
  cancelHref: string;
}

export function UserForm({ mode, user, cancelHref }: UserFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submittingRef = useRef(false);

  // Form state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [username, setUsername] = useState(user?.username || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState(user?.role || "editor");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    submittingRef.current = true;
    setIsSubmitting(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("email", email);
    formData.set("role", role);

    if (mode === "create") {
      formData.set("username", username);
      formData.set("password", password);
      const result = await createUser(formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
    } else if (user) {
      if (password) {
        formData.set("newPassword", password);
      }
      const result = await updateUser(user.id, formData);
      if (result?.error) {
        setError(result.error);
        setIsSubmitting(false);
        submittingRef.current = false;
        return;
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          <p className="font-medium">Error</p>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Basic Info */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="role">Role *</Label>
            <select
              id="role"
              name="role"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {ROLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} - {opt.description}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Credentials */}
      <div className="rounded-lg border p-6">
        <h2 className="text-xl font-semibold mb-4">Credentials</h2>
        <div className="space-y-4">
          {mode === "create" ? (
            <>
              <div>
                <Label htmlFor="username">Username *</Label>
                <Input
                  id="username"
                  name="username"
                  required
                  placeholder="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Used for login. Cannot be changed after creation.
                </p>
              </div>

              <div>
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <Label>Username</Label>
                <p className="text-sm text-muted-foreground py-2">
                  {user?.username || "-"} (cannot be changed)
                </p>
              </div>

              <div>
                <Label htmlFor="password">New Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Leave blank to keep current password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Only fill this if you want to change the password.
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" asChild>
          <Link href={cancelHref}>Cancel</Link>
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? mode === "create"
              ? "Creating..."
              : "Saving..."
            : mode === "create"
            ? "Create User"
            : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
