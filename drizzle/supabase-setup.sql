-- ============================================================
-- Video Sharing Platform - Supabase PostgreSQL Setup
-- DROP toàn bộ tables cũ và tạo lại đúng schema
-- ============================================================

-- Drop các tables cũ (cascade để xóa cả FK)
DROP TABLE IF EXISTS public."watchHistory" CASCADE;
DROP TABLE IF EXISTS public.watch_history CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.dislikes CASCADE;
DROP TABLE IF EXISTS public.comments CASCADE;
DROP TABLE IF EXISTS public.videos CASCADE;
DROP TABLE IF EXISTS public.channels CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.follows CASCADE;
DROP TABLE IF EXISTS public.playlists CASCADE;
DROP TABLE IF EXISTS public.playlist_videos CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;
DROP TABLE IF EXISTS public.hashtags CASCADE;
DROP TABLE IF EXISTS public.categories CASCADE;
DROP TABLE IF EXISTS public.video_chapters CASCADE;
DROP TABLE IF EXISTS public.videos_hashtags CASCADE;

-- Drop các tables từ gym management (Prisma)
DROP TABLE IF EXISTS public.otp_codes CASCADE;
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.member_progress CASCADE;
DROP TABLE IF EXISTS public.attendance_logs CASCADE;
DROP TABLE IF EXISTS public.maintenance_logs CASCADE;
DROP TABLE IF EXISTS public.training_sessions CASCADE;
DROP TABLE IF EXISTS public.staff_schedules CASCADE;
DROP TABLE IF EXISTS public.staff CASCADE;
DROP TABLE IF EXISTS public.feedback CASCADE;
DROP TABLE IF EXISTS public.payments CASCADE;
DROP TABLE IF EXISTS public.subscription_id CASCADE;
DROP TABLE IF EXISTS public.members CASCADE;
DROP TABLE IF EXISTS public.packages CASCADE;
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.gym_rooms CASCADE;
DROP TABLE IF EXISTS public.group_permissions CASCADE;
DROP TABLE IF EXISTS public.user_groups CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.permissions CASCADE;

-- Drop Django tables
DROP TABLE IF EXISTS public.django_admin_log CASCADE;
DROP TABLE IF EXISTS public.django_content_type CASCADE;
DROP TABLE IF EXISTS public.django_migrations CASCADE;
DROP TABLE IF EXISTS public.django_session CASCADE;
DROP TABLE IF EXISTS public.auth_group_permissions CASCADE;
DROP TABLE IF EXISTS public.auth_group CASCADE;
DROP TABLE IF EXISTS public.auth_permission CASCADE;
DROP TABLE IF EXISTS public.app_users_groups CASCADE;
DROP TABLE IF EXISTS public.app_users_user_permissions CASCADE;
DROP TABLE IF EXISTS public.app_users CASCADE;
DROP TABLE IF EXISTS public._prisma_migrations CASCADE;

-- ============================================================
-- Tạo lại tables cho Video Sharing Platform
-- ============================================================

-- Table: users
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  "openId" VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  "loginMethod" VARCHAR(64),
  "passwordHash" TEXT,
  "avatarUrl" TEXT,
  bio TEXT,
  role VARCHAR(10) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Table: channels
CREATE TABLE channels (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "avatarUrl" TEXT,
  "bannerUrl" TEXT,
  "subscriberCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX channels_userId_idx ON channels ("userId");

-- Table: videos
CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  "channelId" INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  "videoUrl" TEXT NOT NULL,
  "thumbnailUrl" TEXT,
  duration INTEGER,
  "viewCount" BIGINT NOT NULL DEFAULT 0,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "dislikeCount" INTEGER NOT NULL DEFAULT 0,
  "commentCount" INTEGER NOT NULL DEFAULT 0,
  category VARCHAR(50),
  "isPublished" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX videos_channelId_idx ON videos ("channelId");
CREATE INDEX videos_createdAt_idx ON videos ("createdAt");

-- Table: comments
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  "videoId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  content TEXT NOT NULL,
  "likeCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX comments_videoId_idx ON comments ("videoId");
CREATE INDEX comments_userId_idx ON comments ("userId");

-- Table: likes
CREATE TABLE likes (
  id SERIAL PRIMARY KEY,
  "videoId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  type VARCHAR(10) NOT NULL CHECK (type IN ('like', 'dislike')),
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX likes_videoId_userId_idx ON likes ("videoId", "userId");

-- Table: subscriptions
CREATE TABLE subscriptions (
  id SERIAL PRIMARY KEY,
  "channelId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX subscriptions_channelId_userId_idx ON subscriptions ("channelId", "userId");

-- Table: watchHistory
CREATE TABLE "watchHistory" (
  id SERIAL PRIMARY KEY,
  "videoId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "watchedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "watchDuration" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "watchHistory_videoId_userId_idx" ON "watchHistory" ("videoId", "userId");
CREATE INDEX "watchHistory_userId_idx" ON "watchHistory" ("userId");
CREATE INDEX "watchHistory_watchedAt_idx" ON "watchHistory" ("watchedAt");

-- ============================================================
-- Foreign key constraints (tạo quan hệ giữa các bảng)
-- ============================================================
ALTER TABLE channels ADD CONSTRAINT fk_channels_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE videos ADD CONSTRAINT fk_videos_channel FOREIGN KEY ("channelId") REFERENCES channels(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT fk_comments_video FOREIGN KEY ("videoId") REFERENCES videos(id) ON DELETE CASCADE;
ALTER TABLE comments ADD CONSTRAINT fk_comments_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE likes ADD CONSTRAINT fk_likes_video FOREIGN KEY ("videoId") REFERENCES videos(id) ON DELETE CASCADE;
ALTER TABLE likes ADD CONSTRAINT fk_likes_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_channel FOREIGN KEY ("channelId") REFERENCES channels(id) ON DELETE CASCADE;
ALTER TABLE subscriptions ADD CONSTRAINT fk_subscriptions_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE "watchHistory" ADD CONSTRAINT fk_watchHistory_video FOREIGN KEY ("videoId") REFERENCES videos(id) ON DELETE CASCADE;
ALTER TABLE "watchHistory" ADD CONSTRAINT fk_watchHistory_user FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
