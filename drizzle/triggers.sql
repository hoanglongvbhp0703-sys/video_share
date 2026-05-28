-- ============================================================
-- Database Triggers — Video Sharing Platform
-- Mục đích: duy trì denormalized counters tự động, loại bỏ
-- race condition từ read-then-write ở application layer.
--
-- Chạy thủ công qua Supabase SQL Editor,
-- hoặc: npm run db:triggers
-- ============================================================

-- ── likes → videos.likeCount / dislikeCount ───────────────
-- Kích hoạt sau INSERT / DELETE / UPDATE(type) trên likes.
-- GREATEST(0, ...) đảm bảo count không âm khi data lệch.

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
$$;

DROP TRIGGER IF EXISTS trg_likes_update_video_counts ON likes;
CREATE TRIGGER trg_likes_update_video_counts
  AFTER INSERT OR DELETE OR UPDATE OF type ON likes
  FOR EACH ROW EXECUTE FUNCTION update_video_like_counts();


-- ── comments → videos.commentCount ───────────────────────

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
$$;

DROP TRIGGER IF EXISTS trg_comments_update_video_count ON comments;
CREATE TRIGGER trg_comments_update_video_count
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_video_comment_count();


-- ── subscriptions → channels.subscriberCount ──────────────

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
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_update_channel_count ON subscriptions;
CREATE TRIGGER trg_subscriptions_update_channel_count
  AFTER INSERT OR DELETE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_channel_subscriber_count();


-- ── playlistVideos → playlists.videoCount + updatedAt ─────

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
$$;

DROP TRIGGER IF EXISTS trg_playlist_videos_update_count ON "playlistVideos";
CREATE TRIGGER trg_playlist_videos_update_count
  AFTER INSERT OR DELETE ON "playlistVideos"
  FOR EACH ROW EXECUTE FUNCTION update_playlist_video_count();
