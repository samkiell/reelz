/**
 * Reelz Admin Bootstrap CLI
 * Usage: npx tsx scripts/bootstrap.ts [username] [password]
 */
import { db } from "../src/lib/db.js";
import { hashPassword } from "../src/lib/auth.js";

async function main() {
  const args = process.argv.slice(2);
  const username = (args[0] || "samkiel").trim().toLowerCase();
  const password = args[1] || "reelz2026";

  console.log(`[Bootstrap] Creating admin account for '${username}'...`);

  const existing = await db.user.findUnique({ where: { username } });
  if (existing) {
    console.log(`[Bootstrap] User '${username}' already exists.`);
    return;
  }

  const passwordHash = await hashPassword(password);
  const user = await db.user.create({
    data: {
      username,
      displayName: username.toUpperCase(),
      passwordHash,
      role: "admin",
    },
  });

  console.log(`✔ Admin account created successfully!`);
  console.log(`  User ID: ${user.id}`);
  console.log(`  Username: ${user.username}`);
  console.log(`  Role: ${user.role}`);
}

main()
  .catch((err) => {
    console.error("Bootstrap error:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

