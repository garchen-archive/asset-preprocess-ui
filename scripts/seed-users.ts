import { db } from "../lib/db/client";
import { users, credentials } from "../lib/db/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seedUsers() {
  try {
    console.log("Seeding users...");

    const password = process.argv[2] || "LetsGetGoing!";
    const hashedPassword = bcrypt.hashSync(password, 10);

    console.log(`Password: ${password}`);
    console.log(`Hashed password: ${hashedPassword}`);

    // Check if admin user already exists
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, "admin@garchen.org"))
      .limit(1);

    let user;
    if (existingUser.length > 0) {
      console.log("Admin user already exists. Checking credentials...");
      user = existingUser[0];

      // Check if credentials exist
      const existingCreds = await db
        .select()
        .from(credentials)
        .where(eq(credentials.userId, user.id))
        .limit(1);

      if (existingCreds.length > 0) {
        console.log("Updating existing credentials...");
        await db
          .update(credentials)
          .set({
            password: hashedPassword,
            updatedAt: new Date()
          })
          .where(eq(credentials.userId, user.id));
      } else {
        console.log("Creating credentials for existing user...");
        await db.insert(credentials).values({
          userId: user.id,
          username: "admin",
          password: hashedPassword,
        });
      }

      console.log("✓ Admin password updated successfully!");
    } else {
      console.log("Creating new admin user...");

      // Insert user first
      [user] = await db
        .insert(users)
        .values({
          name: "Admin",
          email: "admin@garchen.org",
          role: "admin",
        })
        .returning();

      console.log(`Created user with ID: ${user.id}`);

      // Insert credentials
      await db.insert(credentials).values({
        userId: user.id,
        username: "admin",
        password: hashedPassword,
      });

      console.log("✓ Admin user created successfully!");
    }

    console.log(`  Username: admin`);
    console.log(`  Password: ${password}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Role: ${user.role}`);

    process.exit(0);
  } catch (error) {
    console.error("Error seeding users:", error);
    process.exit(1);
  }
}

seedUsers();
