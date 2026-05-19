import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { db } from "./db/client";
import { users, getUserDisplayName } from "./db/schema";
import { eq, and } from "drizzle-orm";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "admin" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        console.log("=== LOGIN ATTEMPT ===");
        console.log("Username:", credentials?.username);

        if (!credentials?.username || !credentials?.password) {
          console.log("Missing credentials");
          return null;
        }

        try {
          // Find user by username (go-auth schema)
          const [user] = await db
            .select()
            .from(users)
            .where(
              and(
                eq(users.username, credentials.username),
                eq(users.status, "active") // Only allow active users
              )
            )
            .limit(1);

          if (!user) {
            console.log("User not found or not active:", credentials.username);
            return null;
          }

          if (!user.passwordHash) {
            console.log("User has no password set:", credentials.username);
            return null;
          }

          console.log("User found:", user.username);

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );

          console.log("Password valid:", isPasswordValid);

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id,
            name: getUserDisplayName(user),
            email: user.email || user.username,
            role: user.userRole,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
