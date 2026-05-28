/**
 * One-time migration: create playlists, playlistVideos, tags, videoTags, notifications, reports tables.
 * Run: node server/add-new-tables.mjs
 */
import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

try {
  await sql`
    CREATE TABLE IF NOT EXISTS "playlists" (
      "id" serial PRIMARY KEY,
      "userId" integer NOT NULL,
      "name" varchar(255) NOT NULL,
      "description" text,
      "isPublic" boolean NOT NULL DEFAULT true,
      "videoCount" integer NOT NULL DEFAULT 0,
      "thumbnailUrl" text,
      "createdAt" timestamp NOT NULL DEFAULT now(),
      "updatedAt" timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "playlists_userId_idx" ON "playlists" ("userId")`;
  console.log('✓ Table "playlists" created');

  await sql`
    CREATE TABLE IF NOT EXISTS "playlistVideos" (
      "id" serial PRIMARY KEY,
      "playlistId" integer NOT NULL,
      "videoId" integer NOT NULL,
      "position" integer NOT NULL DEFAULT 0,
      "addedAt" timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "playlistVideos_playlistId_videoId_idx" ON "playlistVideos" ("playlistId", "videoId")`;
  console.log('✓ Table "playlistVideos" created');

  await sql`
    CREATE TABLE IF NOT EXISTS "tags" (
      "id" serial PRIMARY KEY,
      "name" varchar(100) NOT NULL UNIQUE
    )
  `;
  console.log('✓ Table "tags" created');

  await sql`
    CREATE TABLE IF NOT EXISTS "videoTags" (
      "videoId" integer NOT NULL,
      "tagId" integer NOT NULL,
      PRIMARY KEY ("videoId", "tagId")
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "videoTags_videoId_tagId_idx" ON "videoTags" ("videoId", "tagId")`;
  console.log('✓ Table "videoTags" created');

  await sql`
    CREATE TABLE IF NOT EXISTS "notifications" (
      "id" serial PRIMARY KEY,
      "userId" integer NOT NULL,
      "type" varchar(50) NOT NULL,
      "message" text NOT NULL,
      "isRead" boolean NOT NULL DEFAULT false,
      "metadata" text,
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON "notifications" ("userId")`;
  await sql`CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON "notifications" ("userId", "isRead")`;
  console.log('✓ Table "notifications" created');

  await sql`
    CREATE TABLE IF NOT EXISTS "reports" (
      "id" serial PRIMARY KEY,
      "userId" integer NOT NULL,
      "targetType" varchar(20) NOT NULL,
      "targetId" integer NOT NULL,
      "reason" varchar(100) NOT NULL,
      "description" text,
      "status" varchar(20) NOT NULL DEFAULT 'pending',
      "createdAt" timestamp NOT NULL DEFAULT now()
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS "reports_userId_idx" ON "reports" ("userId")`;
  await sql`CREATE INDEX IF NOT EXISTS "reports_targetType_targetId_idx" ON "reports" ("targetType", "targetId")`;
  console.log('✓ Table "reports" created');

  console.log("\nMigration completed successfully.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
