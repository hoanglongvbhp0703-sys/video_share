/**
 * Migration: add FK constraints + unique indexes to all tables.
 * Safe to re-run — uses DO...EXCEPTION for FKs, IF NOT EXISTS for indexes.
 * Run: node server/add-fk-constraints.mjs
 */
import postgres from "postgres";
import dotenv from "dotenv";
dotenv.config();

const sql = postgres(process.env.DATABASE_URL);

async function addFk(table, constraint, column, refTable, refCol, onDelete = "CASCADE") {
  await sql.unsafe(`
    DO $$ BEGIN
      ALTER TABLE ${table}
        ADD CONSTRAINT ${constraint}
        FOREIGN KEY (${column})
        REFERENCES ${refTable}(${refCol})
        ON DELETE ${onDelete};
    EXCEPTION WHEN duplicate_object THEN NULL;
    END $$;
  `);
  console.log(`  FK ${constraint}`);
}

async function dropOldIndex(name) {
  await sql.unsafe(`DROP INDEX IF EXISTS "${name}"`);
  console.log(`  dropped old index "${name}"`);
}

async function addUnique(name, table, columns) {
  await sql.unsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "${name}" ON ${table} (${columns})`);
  console.log(`  UNIQUE "${name}"`);
}

try {
  console.log("\n─── Foreign Key Constraints ───────────────────────");

  // channels.userId → users.id
  await addFk("channels", "channels_userId_fkey", '"userId"', "users", "id");

  // videos.channelId → channels.id
  await addFk("videos", "videos_channelId_fkey", '"channelId"', "channels", "id");

  // comments.videoId → videos.id
  await addFk("comments", "comments_videoId_fkey", '"videoId"', "videos", "id");
  // comments.userId → users.id
  await addFk("comments", "comments_userId_fkey", '"userId"', "users", "id");

  // likes.videoId → videos.id
  await addFk("likes", "likes_videoId_fkey", '"videoId"', "videos", "id");
  // likes.userId → users.id
  await addFk("likes", "likes_userId_fkey", '"userId"', "users", "id");

  // subscriptions.channelId → channels.id
  await addFk("subscriptions", "subscriptions_channelId_fkey", '"channelId"', "channels", "id");
  // subscriptions.userId → users.id
  await addFk("subscriptions", "subscriptions_userId_fkey", '"userId"', "users", "id");

  // watchHistory.videoId → videos.id
  await addFk('"watchHistory"', '"watchHistory_videoId_fkey"', '"videoId"', "videos", "id");
  // watchHistory.userId → users.id
  await addFk('"watchHistory"', '"watchHistory_userId_fkey"', '"userId"', "users", "id");

  // playlists.userId → users.id
  await addFk("playlists", "playlists_userId_fkey", '"userId"', "users", "id");

  // playlistVideos.playlistId → playlists.id
  await addFk('"playlistVideos"', '"playlistVideos_playlistId_fkey"', '"playlistId"', "playlists", "id");
  // playlistVideos.videoId → videos.id
  await addFk('"playlistVideos"', '"playlistVideos_videoId_fkey"', '"videoId"', "videos", "id");

  // videoTags.videoId → videos.id
  await addFk('"videoTags"', '"videoTags_videoId_fkey"', '"videoId"', "videos", "id");
  // videoTags.tagId → tags.id
  await addFk('"videoTags"', '"videoTags_tagId_fkey"', '"tagId"', "tags", "id");

  // notifications.userId → users.id
  await addFk("notifications", "notifications_userId_fkey", '"userId"', "users", "id");

  // reports.userId → users.id
  await addFk("reports", "reports_userId_fkey", '"userId"', "users", "id");

  console.log("\n─── Unique Indexes (drop old → add unique) ────────");

  // channels: 1 channel per user
  await dropOldIndex("channels_userId_idx");
  await addUnique("channels_userId_uniq", "channels", '"userId"');

  // likes: 1 like/dislike per user per video
  await dropOldIndex("likes_videoId_userId_idx");
  await addUnique("likes_videoId_userId_uniq", "likes", '"videoId", "userId"');

  // subscriptions: 1 subscription per user per channel
  await dropOldIndex("subscriptions_channelId_userId_idx");
  await addUnique("subscriptions_channelId_userId_uniq", "subscriptions", '"channelId", "userId"');

  // playlistVideos: a video appears at most once per playlist
  await dropOldIndex("playlistVideos_playlistId_videoId_idx");
  await addUnique("playlistVideos_playlistId_videoId_uniq", '"playlistVideos"', '"playlistId", "videoId"');

  // videoTags: composite PK already guarantees uniqueness — drop redundant index
  await dropOldIndex("videoTags_videoId_tagId_idx");

  console.log("\n─── Verify ─────────────────────────────────────────");
  const fks = await sql`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table, tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `;
  console.log(`\n  ${fks.length} FK constraints active:`);
  fks.forEach(f =>
    console.log(`    ${f.table_name}.${f.column_name} → ${f.foreign_table}`)
  );

  console.log("\nMigration completed successfully.");
} catch (err) {
  console.error("Migration failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
