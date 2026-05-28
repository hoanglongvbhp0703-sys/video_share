# CLAUDE.md — Video Sharing Platform

## Overview
Full-stack video sharing platform (YouTube-like). Monorepo: React + Vite frontend, Express + tRPC backend, Drizzle ORM + **Supabase PostgreSQL** database.

## Commands
```bash
npm run dev          # Dev server (frontend + backend)
npm run build        # Production build
npm run seed         # Seed database with mock data (node server/seed-data.mjs)
npm run test         # Run Vitest tests
npm run db:push      # Generate + apply drizzle migrations to Supabase
npm run db:setup     # Drop + tạo lại toàn bộ tables (node server/setup-db.mjs)
npm run db:triggers  # Áp dụng PostgreSQL triggers lên Supabase (node server/setup-triggers.mjs)
```

## Architecture

### Stack
- **Frontend**: React 19, Vite, TanStack Query, tRPC client, Tailwind CSS, wouter (routing)
- **Backend**: Express, tRPC server, Drizzle ORM
- **Database**: **Supabase PostgreSQL** (driver: `postgres` / postgres.js)
- **Auth**: Manus OAuth (cookie-based session)
- **Storage**: AWS S3 (presigned URL upload)
- **Tests**: Vitest

### Key Files
- `drizzle/schema.ts` — PostgreSQL schema (pgTable, pgEnum). Source of truth.
- `drizzle/triggers.sql` — SQL triggers reference (counter automation). Áp dụng qua `npm run db:triggers`.
- `server/db.ts` — All DB queries. Lazy connection via `getDb()`.
- `server/routers.ts` — All tRPC routes (videos, channels, comments, likes, subscriptions).
- `server/storage.ts` — File storage: Forge/S3 nếu có env vars, local disk (`server/uploads/`) nếu không.
- `server/_core/storageProxy.ts` — Serve `/manus-storage/*` (Forge) và `/uploads/*` (local).
- `server/setup-triggers.mjs` — Script áp dụng triggers lên Supabase.
- `client/src/` — React pages: Home, Watch, Channel, Upload, Search, Trending.
- `drizzle.config.ts` — Drizzle Kit config (dialect: postgresql).
- `.env` — DATABASE_URL (Supabase session pooler, port 5432).

### Database Tables
| Table | Description |
|-------|-------------|
| `users` | Auth users (openId from Manus OAuth) |
| `channels` | User channels (1 per user) |
| `videos` | Video metadata + counts |
| `comments` | Video comments |
| `likes` | Like/dislike per user per video |
| `subscriptions` | Channel subscriptions |
| `watchHistory` | View tracking + watch duration |
| `playlists` | User-created playlists |
| `playlistVideos` | Videos within playlists (ordered) |
| `tags` | Video tags |
| `videoTags` | Many-to-many videos ↔ tags |
| `notifications` | User notifications |
| `reports` | Video/comment reports |

### Database Triggers (áp dụng qua `npm run db:triggers`)
Các trigger duy trì denormalized counters tự động — atomic, không race condition:

| Trigger | Bảng nguồn | Cập nhật |
|---------|-----------|---------|
| `trg_likes_update_video_counts` | `likes` INSERT/DELETE/UPDATE(type) | `videos.likeCount` / `dislikeCount` |
| `trg_comments_update_video_count` | `comments` INSERT/DELETE | `videos.commentCount` |
| `trg_subscriptions_update_channel_count` | `subscriptions` INSERT/DELETE | `channels.subscriberCount` |
| `trg_playlist_videos_update_count` | `playlistVideos` INSERT/DELETE | `playlists.videoCount` + `updatedAt` |

### Database Connection
- **Driver**: `postgres` (postgres.js, ESM-compatible)
- **URL**: Supabase session pooler (port 5432) — supports DDL + runtime queries
- **Connection**: Lazy singleton in `getDb()`, created on first query

## Supabase Setup
```bash
npm run db:setup     # Drop tất cả tables cũ + tạo lại đúng schema
npm run seed         # Seed 5 channels, 50 videos, ~400 comments, ~750 likes
npm run db:triggers  # Áp dụng 4 counter triggers (chạy 1 lần sau db:setup)
```
Hoặc chạy `drizzle/supabase-setup.sql` + `drizzle/triggers.sql` thủ công trong Supabase SQL Editor.

**Thứ tự setup lần đầu:**
```bash
npm run db:setup && npm run seed && npm run db:triggers
```

## Conventions
- **camelCase column names** (e.g., `"openId"`, `"channelId"`) — must be quoted in raw SQL
- **ESM**: project uses `"type": "module"` — use `.mjs` for scripts
- **tRPC**: type-safe API, no REST endpoints. All routes in `server/routers.ts`
- **No migrations folder**: use `pnpm db:push` (drizzle-kit generate + migrate) for schema changes

## Feature Status

### Hoàn chỉnh
- Home feed, Video watch page, Channel page
- Like/dislike, Comments, Subscribe/unsubscribe
- Video upload: local disk fallback (`server/uploads/`) khi không có Forge/S3 config
- Search, Trending page, Category page
- Watch history + view count tracking
- Playlists (CRUD + add/remove video)
- Tags (tag video, search by tag)
- Notifications (create, read, mark as read)
- Reports (video/comment reporting)
- Mock seed data: 5 channels, 50 videos, ~400 comments, ~750 likes, ~118 subscriptions
- `channelName` hiển thị đúng trong VideoCard (LEFT JOIN channels trong tất cả query)
- `category` column thêm vào DB + seed data (news/gaming/music/movies/live/sports)
- Related videos trong Watch page dùng cùng channel (không random)
- **Database triggers**: 4 counter triggers — atomic, không race condition

### Còn thiếu / cần làm
- **Upload video lớn (>35MB)**: cần multipart upload thay vì gửi bytes qua tRPC body (limit 50MB thực tế ~35MB do base64 overhead)
- **`npm run db:triggers` chưa chạy lên Supabase production** — cần chạy 1 lần sau khi deploy
- **Bug sidebar flash khi chuyển trang**: khi click link chuyển trang, sidebar thoáng hiện trạng thái mở (như ấn hamburger) trước khi sang trang mới — chưa điều tra nguyên nhân (`Layout.tsx`, `Sidebar.tsx`, `TopNavigation.tsx`)
- **Flash lần đầu mở app**: lần đầu tiên vào app (localStorage trống), TopNavigation thoáng hiện "Đăng nhập" trước khi load xong — cần SSR hoặc loading screen để fix triệt để
- **GitHub token bị lộ trong chat**: token `ghp_W7uM6...` đã share trong lịch sử — cần revoke ngay tại GitHub Settings → Developer settings → Personal access tokens
- **Video duration**: `duration` luôn được set `0` khi upload — cần extract duration từ video element trong `Upload.tsx` (tương tự `extractFirstFrame`)
- **Trang ComponentShowcase**: `client/src/pages/ComponentShowcase.tsx` là trang dev nội bộ, chưa có route — cân nhắc xóa hoặc ẩn

### Đã fix — Session cũ
- ✅ `tsconfig.json`: xóa `baseUrl` deprecated (TypeScript 6.0 warning)
- ✅ Windows: thêm `cross-env` cho scripts `dev` và `start` trong `package.json`
- ✅ `getLoginUrl()` không crash khi thiếu `VITE_OAUTH_PORTAL_URL` / `VITE_APP_ID`
- ✅ Sidebar toggle: hamburger giờ ẩn/hiện sidebar trên cả desktop + mobile
- ✅ Login page (`/login`): OAuth mode + dev mode form (không cần Manus OAuth)
- ✅ Dev mock login: `POST /api/dev-login` (chỉ dev, tắt production). `JWT_SECRET` trong `.env` là bắt buộc.
- ✅ Đăng ký button: TopNavigation hiển thị cả "Đăng ký" + "Đăng nhập" khi chưa login
- ✅ `getLoginUrl` fallback: `"/"` → `"/login"` khi thiếu env vars. Thêm `getRegisterUrl()`.
- ✅ `/settings` route: redirect về `/profile`; `/help` route: redirect về `/`

### Đã fix — Session 2026-05-28 (phần 1)
- ✅ **Database triggers** (4 triggers): `trg_likes_update_video_counts`, `trg_comments_update_video_count`, `trg_subscriptions_update_channel_count`, `trg_playlist_videos_update_count` — loại bỏ race condition từ read-then-write pattern
- ✅ **db.ts đơn giản hoá**: bỏ manual counter updates khỏi 6 hàm (`incrementVideoViewCount`, `createComment`, `toggleLike`, `toggleSubscription`, `addVideoToPlaylist`, `removeVideoFromPlaylist`) — mỗi hàm tiết kiệm 1-2 DB round-trips
- ✅ **Local storage fallback**: `storagePut()` không crash khi thiếu `BUILT_IN_FORGE_API_URL` — lưu file vào `server/uploads/`, serve qua `/uploads/*` (Express static)

### Đã fix — Session 2026-05-28 (phần 2)
- ✅ **Video autoplay** (`client/src/components/VideoPlayer.tsx`): `handleCanPlay` gọi `video.play()` tự động; nếu browser chặn autoplay có âm thanh thì fallback `video.muted = true` và play lại — không dùng `autoPlay` attribute để tránh double-trigger
- ✅ **Auto-thumbnail từ frame đầu video** (`client/src/pages/Upload.tsx`): thêm `extractFirstFrame(file)` dùng Canvas API — khi user chọn video mà chưa có thumbnail, tự động chụp frame tại giây thứ 1 (hoặc `duration/2` nếu video ngắn hơn 2s), upload như ảnh JPEG. Không cần ffmpeg. Label hiển thị "Ảnh tự động từ giây đầu video (có thể thay thế)". User chọn ảnh khác sẽ ghi đè.
- ✅ **Fix flash unauthenticated khi chuyển trang** (`client/src/_core/hooks/useAuth.ts`): dùng `placeholderData` từ localStorage — lần đầu render component đã có `isAuthenticated = true` ngay lập tức, không flash. Fix bug localStorage ghi `"undefined"` (chuỗi), chuyển sang `useEffect` chỉ ghi khi server xác nhận (`!meQuery.isPlaceholderData`). Xoá localStorage khi logout hoặc server trả lỗi auth.
- ✅ **GitHub repo + gitignore**: push lên `github.com/hoanglongvbhp0703-sys/video_share`. Loại khỏi tracking: `.claude/`, `drizzle/meta/`, `drizzle/[0-9]*.sql`, `drizzle/migrations/`, `package-lock.json`, `todo.md`, `references/`, `template.json`, `server/add-*.mjs`, `server/check-*.mjs`, `client/public/__manus__/`

## Local Dev Setup (Windows)
```bash
# 1. Cài dependencies (dùng pnpm — có sẵn trong devDependencies)
npx pnpm install

# 2. Chạy server
npm run dev   # http://localhost:3000

# 3. Seed dữ liệu (nếu DB trống)
npm run seed
```
**Env vars cần có trong `.env`:**
- `DATABASE_URL` — Supabase session pooler (đã có)
- `JWT_SECRET` — dùng cho ký session token, ví dụ `JWT_SECRET=dev-secret-key-minimum-32chars` (cần thêm để dev login hoạt động)

## Gotchas
- **Counter updates đã chuyển sang triggers** — KHÔNG thêm lại manual `likeCount++` / `commentCount++` / `subscriberCount++` trong `db.ts`. Triggers xử lý atomic.
- **`db:triggers` cần chạy sau `db:setup`** — nếu drop/recreate tables thì triggers mất, phải chạy lại `npm run db:triggers`.
- **Upload file limit 50MB** — `express.json({ limit: "50mb" })` trong `index.ts`. File video qua tRPC body chỉ hỗ trợ ~35MB thực tế (base64 overhead). File lớn hơn cần multipart.
- **Local uploads không persistent qua `db:setup`** — `server/uploads/` là git-ignored. Nếu reset DB và seed lại, video cũ trong `uploads/` vẫn còn nhưng DB records mất.
- **`BUILT_IN_FORGE_API_URL` optional** — `storagePut()` tự fallback về local disk nếu thiếu. Production cần set Forge vars.
- **Auth `placeholderData` từ localStorage** — `useAuth` dùng localStorage làm cache tạm để tránh flash. Session hết hạn → server trả 401 → localStorage bị xoá → user phải login lại bình thường. KHÔNG đọc localStorage nếu muốn force re-auth.
- **`extractFirstFrame()` trong Upload** — dùng Canvas API client-side, không cần ffmpeg. Video phải load được trong browser. Frame tại `Math.min(1, duration/2)` giây. Nếu video lỗi hoặc format không hỗ trợ, thumbnail bị bỏ qua silently.
- **Video `duration` luôn là `0` khi upload** — `createWithUrlsMutation` hardcode `duration: 0`. Cần extract từ video element trước khi submit (tương tự `extractFirstFrame`).
- Schema was MySQL (`mysqlTable`) — migrated to PostgreSQL (`pgTable`) for Supabase
- `onDuplicateKeyUpdate` → `onConflictDoUpdate` (PostgreSQL syntax in Drizzle)
- `updatedAt` columns: chỉ `playlists` có trigger tự cập nhật (khi add/remove video). Các bảng khác update thủ công.
- `watchHistory`, `playlistVideos` table names phải quoted trong raw SQL do camelCase
- `viewCount` là `bigint` trong schema — serialize thành number với `{ mode: "number" }`
