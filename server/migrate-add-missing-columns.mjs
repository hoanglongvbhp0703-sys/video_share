/**
 * One-time migration: add missing columns/tables to existing Supabase DB.
 * Safe to run multiple times (uses IF NOT EXISTS / DO blocks).
 *
 * Run: node server/migrate-add-missing-columns.mjs
 */
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL (or DIRECT_URL) is not set");

const sql = postgres(url, { ssl: "require" });

async function run() {
  console.log("🔧 Applying missing columns & tables...\n");

  const migrations = [
    {
      name: 'channels.nameNorm column',
      sql: `ALTER TABLE channels ADD COLUMN IF NOT EXISTS "nameNorm" VARCHAR(255)`,
    },
    {
      name: 'videos.titleNorm column',
      sql: `ALTER TABLE videos ADD COLUMN IF NOT EXISTS "titleNorm" VARCHAR(255)`,
    },
    {
      name: 'channels_userId_uniq index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "channels_userId_uniq" ON channels ("userId")`,
    },
    {
      name: 'likes unique index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "likes_videoId_userId_uniq" ON likes ("videoId", "userId")`,
    },
    {
      name: 'subscriptions unique index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "subscriptions_channelId_userId_uniq" ON subscriptions ("channelId", "userId")`,
    },
    {
      name: 'playlists table',
      sql: `CREATE TABLE IF NOT EXISTS playlists (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        "isPublic" BOOLEAN NOT NULL DEFAULT TRUE,
        "videoCount" INTEGER NOT NULL DEFAULT 0,
        "thumbnailUrl" TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: 'playlists userId index',
      sql: `CREATE INDEX IF NOT EXISTS "playlists_userId_idx" ON playlists ("userId")`,
    },
    {
      name: 'playlistVideos table',
      sql: `CREATE TABLE IF NOT EXISTS "playlistVideos" (
        id SERIAL PRIMARY KEY,
        "playlistId" INTEGER NOT NULL REFERENCES playlists(id) ON DELETE CASCADE,
        "videoId" INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        position INTEGER NOT NULL DEFAULT 0,
        "addedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: 'playlistVideos unique index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "playlistVideos_playlistId_videoId_uniq" ON "playlistVideos" ("playlistId", "videoId")`,
    },
    {
      name: 'playlistVideos playlistId index',
      sql: `CREATE INDEX IF NOT EXISTS "playlistVideos_playlistId_idx" ON "playlistVideos" ("playlistId")`,
    },
    {
      name: 'tags table',
      sql: `CREATE TABLE IF NOT EXISTS tags (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE
      )`,
    },
    {
      name: 'videoTags table',
      sql: `CREATE TABLE IF NOT EXISTS "videoTags" (
        "videoId" INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
        "tagId" INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
        PRIMARY KEY ("videoId", "tagId")
      )`,
    },
    {
      name: 'notifications table',
      sql: `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
        metadata TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: 'notifications userId index',
      sql: `CREATE INDEX IF NOT EXISTS "notifications_userId_idx" ON notifications ("userId")`,
    },
    {
      name: 'notifications userId+isRead index',
      sql: `CREATE INDEX IF NOT EXISTS "notifications_userId_isRead_idx" ON notifications ("userId", "isRead")`,
    },
    {
      name: 'reports table',
      sql: `CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        "targetType" VARCHAR(20) NOT NULL,
        "targetId" INTEGER NOT NULL,
        reason VARCHAR(100) NOT NULL,
        description TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: 'reports userId index',
      sql: `CREATE INDEX IF NOT EXISTS "reports_userId_idx" ON reports ("userId")`,
    },
    {
      name: 'reports targetType+targetId index',
      sql: `CREATE INDEX IF NOT EXISTS "reports_targetType_targetId_idx" ON reports ("targetType", "targetId")`,
    },
    {
      name: 'passwordResets table',
      sql: `CREATE TABLE IF NOT EXISTS "passwordResets" (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(64) NOT NULL UNIQUE,
        "expiresAt" TIMESTAMP NOT NULL,
        "usedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
    },
    {
      name: 'passwordResets token unique index',
      sql: `CREATE UNIQUE INDEX IF NOT EXISTS "passwordResets_token_uniq" ON "passwordResets" (token)`,
    },
    {
      name: 'passwordResets userId index',
      sql: `CREATE INDEX IF NOT EXISTS "passwordResets_userId_idx" ON "passwordResets" ("userId")`,
    },
  ];

  let ok = 0;
  for (const m of migrations) {
    try {
      await sql.unsafe(m.sql);
      console.log(`  ✓ ${m.name}`);
      ok++;
    } catch (err) {
      if (err.message.includes("already exists")) {
        console.log(`  - ${m.name} (already exists)`);
      } else {
        console.warn(`  ✗ ${m.name}: ${err.message}`);
      }
    }
  }

  console.log(`\n✅ Done (${ok} applied)`);
  await sql.end();
}

run().catch(e => { console.error(e); process.exit(1); });
