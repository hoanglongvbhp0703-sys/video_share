/**
 * One-time script: add avatarUrl + bio columns to users table.
 * Run: node server/add-profile-columns.mjs
 */
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

try {
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT`;
  console.log('✓ Column "avatarUrl" added (or already exists)');

  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS "bio" TEXT`;
  console.log('✓ Column "bio" added (or already exists)');

  console.log("\nMigration completed successfully.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
