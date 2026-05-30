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
DROP TABLE IF EXISTS public."playlistVideos" CASCADE;
DROP TABLE IF EXISTS public.playlists CASCADE;
DROP TABLE IF EXISTS public.playlist_videos CASCADE;
DROP TABLE IF EXISTS public."videoTags" CASCADE;
DROP TABLE IF EXISTS public.tags CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public."passwordResets" CASCADE;
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
  "nameNorm" VARCHAR(255),
  description TEXT,
  "avatarUrl" TEXT,
  "bannerUrl" TEXT,
  "subscriberCount" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "channels_userId_uniq" ON channels ("userId");
CREATE INDEX channels_userId_idx ON channels ("userId");

-- Table: videos
CREATE TABLE videos (
  id SERIAL PRIMARY KEY,
  "channelId" INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  "titleNorm" VARCHAR(255),
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

-- Unique indexes on existing tables
CREATE UNIQUE INDEX "likes_videoId_userId_uniq" ON likes ("videoId", "userId");
CREATE UNIQUE INDEX "subscriptions_channelId_userId_uniq" ON subscriptions ("channelId", "userId");

-- Table: playlists
CREATE TABLE playlists (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  "isPublic" BOOLEAN NOT NULL DEFAULT TRUE,
  "videoCount" INTEGER NOT NULL DEFAULT 0,
  "thumbnailUrl" TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "playlists_userId_idx" ON playlists ("userId");
ALTER TABLE playlists ADD CONSTRAINT "fk_playlists_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- Table: playlistVideos
CREATE TABLE "playlistVideos" (
  id SERIAL PRIMARY KEY,
  "playlistId" INTEGER NOT NULL,
  "videoId" INTEGER NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  "addedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "playlistVideos_playlistId_videoId_uniq" ON "playlistVideos" ("playlistId", "videoId");
CREATE INDEX "playlistVideos_playlistId_idx" ON "playlistVideos" ("playlistId");
ALTER TABLE "playlistVideos" ADD CONSTRAINT "fk_playlistVideos_playlist" FOREIGN KEY ("playlistId") REFERENCES playlists(id) ON DELETE CASCADE;
ALTER TABLE "playlistVideos" ADD CONSTRAINT "fk_playlistVideos_video" FOREIGN KEY ("videoId") REFERENCES videos(id) ON DELETE CASCADE;

-- Table: tags
CREATE TABLE tags (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE
);

-- Table: videoTags
CREATE TABLE "videoTags" (
  "videoId" INTEGER NOT NULL,
  "tagId" INTEGER NOT NULL,
  PRIMARY KEY ("videoId", "tagId")
);
ALTER TABLE "videoTags" ADD CONSTRAINT "fk_videoTags_video" FOREIGN KEY ("videoId") REFERENCES videos(id) ON DELETE CASCADE;
ALTER TABLE "videoTags" ADD CONSTRAINT "fk_videoTags_tag" FOREIGN KEY ("tagId") REFERENCES tags(id) ON DELETE CASCADE;

-- Table: notifications
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
  metadata TEXT,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "notifications_userId_idx" ON notifications ("userId");
CREATE INDEX "notifications_userId_isRead_idx" ON notifications ("userId", "isRead");
ALTER TABLE notifications ADD CONSTRAINT "fk_notifications_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- Table: reports
CREATE TABLE reports (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "targetType" VARCHAR(20) NOT NULL,
  "targetId" INTEGER NOT NULL,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "reports_userId_idx" ON reports ("userId");
CREATE INDEX "reports_targetType_targetId_idx" ON reports ("targetType", "targetId");
ALTER TABLE reports ADD CONSTRAINT "fk_reports_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- Table: passwordResets
CREATE TABLE "passwordResets" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP NOT NULL,
  "usedAt" TIMESTAMP,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX "passwordResets_token_uniq" ON "passwordResets" (token);
CREATE INDEX "passwordResets_userId_idx" ON "passwordResets" ("userId");
ALTER TABLE "passwordResets" ADD CONSTRAINT "fk_passwordResets_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;

-- Table: livestreams
CREATE TABLE livestreams (
  id SERIAL PRIMARY KEY,
  "channelId" INTEGER NOT NULL,
  title VARCHAR(255) NOT NULL,
  status VARCHAR(10) NOT NULL DEFAULT 'live' CHECK (status IN ('live', 'ended')),
  "viewerCount" INTEGER NOT NULL DEFAULT 0,
  "thumbnailUrl" TEXT,
  "videoUrl" TEXT,
  "startedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "endedAt" TIMESTAMP
);
CREATE INDEX livestreams_channelId_idx ON livestreams ("channelId");
CREATE INDEX livestreams_status_idx ON livestreams (status);
ALTER TABLE livestreams ADD CONSTRAINT fk_livestreams_channel FOREIGN KEY ("channelId") REFERENCES channels(id) ON DELETE CASCADE;

-- Table: livestreamSignals (WebRTC offer/answer)
CREATE TABLE "livestreamSignals" (
  id SERIAL PRIMARY KEY,
  "livestreamId" INTEGER NOT NULL,
  "viewerId" INTEGER NOT NULL,
  "fromRole" VARCHAR(10) NOT NULL CHECK ("fromRole" IN ('streamer', 'viewer')),
  type VARCHAR(10) NOT NULL CHECK (type IN ('offer', 'answer')),
  payload TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "lsSignals_livestreamId_viewer_idx" ON "livestreamSignals" ("livestreamId", "viewerId");
ALTER TABLE "livestreamSignals" ADD CONSTRAINT "fk_lsSignals_livestream" FOREIGN KEY ("livestreamId") REFERENCES livestreams(id) ON DELETE CASCADE;

-- Table: liveChats
CREATE TABLE "liveChats" (
  id SERIAL PRIMARY KEY,
  "livestreamId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "userName" VARCHAR(255) NOT NULL,
  message VARCHAR(500) NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX "liveChats_livestreamId_idx" ON "liveChats" ("livestreamId");
ALTER TABLE "liveChats" ADD CONSTRAINT "fk_liveChats_livestream" FOREIGN KEY ("livestreamId") REFERENCES livestreams(id) ON DELETE CASCADE;
ALTER TABLE "liveChats" ADD CONSTRAINT "fk_liveChats_user" FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE;
