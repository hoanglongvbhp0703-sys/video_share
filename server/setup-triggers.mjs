/**
 * Áp dụng database triggers lên Supabase PostgreSQL.
 * Chạy: npm run db:triggers
 *
 * Script idempotent — chạy lại nhiều lần không gây lỗi.
 * Mỗi block được execute riêng để dễ debug khi có lỗi.
 */
import postgres from "postgres";
import dotenv from "dotenv";

dotenv.config();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const sql = postgres(DATABASE_URL, { ssl: "require" });

const blocks = [
  // ── likes → videos.likeCount / dislikeCount ──────────────
  {
    name: "fn update_video_like_counts",
    sql: `
      CREATE OR REPLACE FUNCTION update_video_like_counts()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          IF NEW.type = 'like' THEN
            UPDATE videos SET "likeCount" = "likeCount" + 1 WHERE id = NEW."videoId";
          ELSE
            UPDATE videos SET "dislikeCount" = "dislikeCount" + 1 WHERE id = NEW."videoId";
          END IF;

        ELSIF TG_OP = 'DELETE' THEN
          IF OLD.type = 'like' THEN
            UPDATE videos SET "likeCount" = GREATEST(0, "likeCount" - 1) WHERE id = OLD."videoId";
          ELSE
            UPDATE videos SET "dislikeCount" = GREATEST(0, "dislikeCount" - 1) WHERE id = OLD."videoId";
          END IF;

        ELSIF TG_OP = 'UPDATE' AND OLD.type != NEW.type THEN
          IF NEW.type = 'like' THEN
            UPDATE videos SET
              "likeCount"    = "likeCount" + 1,
              "dislikeCount" = GREATEST(0, "dislikeCount" - 1)
            WHERE id = NEW."videoId";
          ELSE
            UPDATE videos SET
              "dislikeCount" = "dislikeCount" + 1,
              "likeCount"    = GREATEST(0, "likeCount" - 1)
            WHERE id = NEW."videoId";
          END IF;
        END IF;

        RETURN NULL;
      END;
      $$
    `,
  },
  {
    name: "trigger trg_likes_update_video_counts (drop)",
    sql: `DROP TRIGGER IF EXISTS trg_likes_update_video_counts ON likes`,
  },
  {
    name: "trigger trg_likes_update_video_counts (create)",
    sql: `
      CREATE TRIGGER trg_likes_update_video_counts
        AFTER INSERT OR DELETE OR UPDATE OF type ON likes
        FOR EACH ROW EXECUTE FUNCTION update_video_like_counts()
    `,
  },

  // ── comments → videos.commentCount ───────────────────────
  {
    name: "fn update_video_comment_count",
    sql: `
      CREATE OR REPLACE FUNCTION update_video_comment_count()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE videos SET "commentCount" = "commentCount" + 1 WHERE id = NEW."videoId";
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE videos SET "commentCount" = GREATEST(0, "commentCount" - 1) WHERE id = OLD."videoId";
        END IF;
        RETURN NULL;
      END;
      $$
    `,
  },
  {
    name: "trigger trg_comments_update_video_count (drop)",
    sql: `DROP TRIGGER IF EXISTS trg_comments_update_video_count ON comments`,
  },
  {
    name: "trigger trg_comments_update_video_count (create)",
    sql: `
      CREATE TRIGGER trg_comments_update_video_count
        AFTER INSERT OR DELETE ON comments
        FOR EACH ROW EXECUTE FUNCTION update_video_comment_count()
    `,
  },

  // ── subscriptions → channels.subscriberCount ─────────────
  {
    name: "fn update_channel_subscriber_count",
    sql: `
      CREATE OR REPLACE FUNCTION update_channel_subscriber_count()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE channels SET "subscriberCount" = "subscriberCount" + 1 WHERE id = NEW."channelId";
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE channels SET "subscriberCount" = GREATEST(0, "subscriberCount" - 1) WHERE id = OLD."channelId";
        END IF;
        RETURN NULL;
      END;
      $$
    `,
  },
  {
    name: "trigger trg_subscriptions_update_channel_count (drop)",
    sql: `DROP TRIGGER IF EXISTS trg_subscriptions_update_channel_count ON subscriptions`,
  },
  {
    name: "trigger trg_subscriptions_update_channel_count (create)",
    sql: `
      CREATE TRIGGER trg_subscriptions_update_channel_count
        AFTER INSERT OR DELETE ON subscriptions
        FOR EACH ROW EXECUTE FUNCTION update_channel_subscriber_count()
    `,
  },

  // ── playlistVideos → playlists.videoCount + updatedAt ────
  {
    name: "fn update_playlist_video_count",
    sql: `
      CREATE OR REPLACE FUNCTION update_playlist_video_count()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        IF TG_OP = 'INSERT' THEN
          UPDATE playlists
          SET "videoCount" = "videoCount" + 1, "updatedAt" = NOW()
          WHERE id = NEW."playlistId";
        ELSIF TG_OP = 'DELETE' THEN
          UPDATE playlists
          SET "videoCount" = GREATEST(0, "videoCount" - 1), "updatedAt" = NOW()
          WHERE id = OLD."playlistId";
        END IF;
        RETURN NULL;
      END;
      $$
    `,
  },
  {
    name: 'trigger trg_playlist_videos_update_count (drop)',
    sql: `DROP TRIGGER IF EXISTS trg_playlist_videos_update_count ON "playlistVideos"`,
  },
  {
    name: 'trigger trg_playlist_videos_update_count (create)',
    sql: `
      CREATE TRIGGER trg_playlist_videos_update_count
        AFTER INSERT OR DELETE ON "playlistVideos"
        FOR EACH ROW EXECUTE FUNCTION update_playlist_video_count()
    `,
  },
];

async function setupTriggers() {
  try {
    console.log("🔧 Kết nối Supabase...");
    await sql`SELECT 1`;
    console.log("✅ Kết nối thành công!\n");

    let success = 0;
    let failed = 0;

    for (const block of blocks) {
      try {
        await sql.unsafe(block.sql);
        console.log(`  ✓ ${block.name}`);
        success++;
      } catch (err) {
        console.error(`  ✗ ${block.name}: ${err.message}`);
        failed++;
      }
    }

    console.log(`\n📊 Kết quả: ${success} thành công, ${failed} lỗi`);

    if (failed === 0) {
      console.log("✅ Tất cả triggers đã được áp dụng!");
      console.log("\nTriggers đã tạo:");
      console.log("  • trg_likes_update_video_counts        (likes → likeCount/dislikeCount)");
      console.log("  • trg_comments_update_video_count      (comments → commentCount)");
      console.log("  • trg_subscriptions_update_channel_count (subscriptions → subscriberCount)");
      console.log("  • trg_playlist_videos_update_count     (playlistVideos → videoCount)");
    } else {
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Lỗi kết nối:", err.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setupTriggers();
