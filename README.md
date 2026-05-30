# VideoShare — Video Sharing Platform

YouTube-like video sharing platform. Full-stack monorepo: React + Vite frontend, Express + tRPC backend, Drizzle ORM + Supabase PostgreSQL.

---

## Live Access

| Environment | URL |
|---|---|
| Local Dev | http://localhost:3000 |
| Admin Panel | http://localhost:3000/admin |

**Default accounts (after `npm run seed`):**

| Email | Password | Role |
|---|---|---|
| `admin@example.com` | `Admin123!` | admin |
| `user1@example.com` | `Password123!` | user |
| `user2@example.com` | `Password123!` | user |
| `user3@example.com` | `Password123!` | user |
| `user4@example.com` | `Password123!` | user |
| `user5@example.com` | `Password123!` | user |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 7, TanStack Query v5, tRPC v11, Tailwind CSS v4, Wouter |
| Backend | Express 4, tRPC server, Drizzle ORM |
| Database | Supabase PostgreSQL (driver: postgres.js) |
| Auth | Email + bcrypt password. JWT stored in cookie + `sessionStorage` (per-tab isolation) |
| Storage | Supabase Storage > local disk fallback (`server/uploads/`) |
| i18n | react-i18next — 日本語 / Tiếng Việt / English (default: **日本語**) |
| Tests | Vitest (unit) + Playwright (API integration, 45 tests) |
| AI Chatbot | Groq `llama-3.3-70b-versatile` (free tier) — RAG architecture |
| Live Stream | WebRTC P2P + polling-based signaling via tRPC |
| Image Crop | react-easy-crop — circular avatar (1:1) + 16:4 banner |

---

## Directory Structure

```
video-sharing-platform/
├── client/                            # React frontend (Vite)
│   ├── public/
│   │   └── favicon.svg                # Film strip + play button SVG logo
│   └── src/
│       ├── _core/
│       │   └── hooks/
│       │       └── useAuth.ts         # Auth hook with isAuthReady flag
│       ├── components/
│       │   ├── ImageCropDialog.tsx    # Avatar/banner crop dialog (react-easy-crop)
│       │   ├── Layout.tsx             # App shell — mounts VideoChatBot globally
│       │   ├── SaveToPlaylistDialog.tsx
│       │   ├── Sidebar.tsx            # Persistent state via localStorage
│       │   ├── TopNavigation.tsx      # Bell dropdown + language switcher + autocomplete
│       │   ├── VideoChatBot.tsx       # Floating AI chatbot (Groq RAG)
│       │   ├── VideoCard.tsx          # Thumbnail + watch progress bar
│       │   └── VideoPlayer.tsx        # HTML5 player + resume playback
│       ├── lib/
│       │   ├── i18n.ts                # i18next config — default lang: ja
│       │   └── useDateLocale.ts       # date-fns locale hook (vi/enUS/ja)
│       ├── locales/
│       │   ├── vi.ts                  # Tiếng Việt (~600 keys, 23 namespaces)
│       │   ├── en.ts                  # English
│       │   └── ja.ts                  # 日本語
│       └── pages/
│           ├── admin/
│           │   ├── AdminDashboard.tsx
│           │   ├── AdminUsers.tsx
│           │   └── AdminReports.tsx
│           ├── Landing.tsx            # Animated landing for guests
│           ├── Home.tsx
│           ├── Watch.tsx              # Video player + comments + emoji picker
│           ├── Channel.tsx            # Channel page + avatar/banner crop/upload
│           ├── Upload.tsx             # Video upload + auto-thumbnail (Canvas API)
│           ├── Search.tsx
│           ├── Trending.tsx
│           ├── History.tsx            # Watch history (deduplicated by video)
│           ├── Notifications.tsx
│           ├── Playlists.tsx
│           ├── PlaylistDetail.tsx
│           ├── Profile.tsx
│           ├── Settings.tsx           # Dark mode + language picker
│           ├── GoLive.tsx             # Streamer: camera + MediaRecorder + WebRTC
│           ├── LiveWatch.tsx          # Viewer: WebRTC player + live chat
│           ├── Replay.tsx             # Replay recorded livestream (/replay/:id)
│           ├── Register.tsx
│           ├── Login.tsx
│           ├── ForgotPassword.tsx
│           ├── ResetPassword.tsx
│           ├── Help.tsx               # FAQ searchable (8 categories)
│           ├── Tag.tsx
│           └── Category.tsx
├── server/
│   ├── _core/
│   │   ├── index.ts                   # Express app + static serve + prod build
│   │   ├── trpc.ts                    # publicProcedure / protectedProcedure / adminProcedure
│   │   ├── localAuth.ts               # POST /api/auth/login (bcrypt verify)
│   │   ├── sdk.ts                     # Session management + auth middleware
│   │   ├── cookies.ts                 # Cookie options helper
│   │   ├── env.ts                     # Env var access
│   │   └── storageProxy.ts            # Serve /uploads/* (local disk)
│   ├── db.ts                          # All DB queries via Drizzle ORM
│   ├── routers.ts                     # All tRPC routes (videos, channels, auth, admin, livestreams, ai)
│   ├── storage.ts                     # storagePut(): Supabase Storage > local disk
│   ├── setup-db.mjs                   # Drop + recreate all tables
│   ├── migrate-add-missing-columns.mjs # Safe patch — adds missing columns/tables
│   ├── setup-triggers.mjs             # Apply 4 PostgreSQL counter triggers
│   └── seed-data.mjs                  # 5 channels, 20 videos, 6 users
├── drizzle/
│   ├── schema.ts                      # PostgreSQL schema — source of truth
│   ├── supabase-setup.sql             # Full CREATE TABLE SQL (mirrors schema.ts)
│   └── triggers.sql                   # Counter trigger SQL reference
├── shared/
│   ├── const.ts                       # Shared constants (COOKIE_NAME, SESSION_KEY)
│   └── normalize.ts                   # normalizeVi() — diacritic removal for search
├── tests/
│   └── api/
│       ├── global-setup.ts            # Create Playwright test accounts before suite
│       ├── helpers.ts                 # login(), tGet(), tPost() with superjson unwrap
│       ├── auth.spec.ts               # 16 auth endpoint tests
│       ├── videos.spec.ts             # 17 video endpoint tests
│       └── channels.spec.ts           # 12 channel endpoint tests
├── .env                               # Local env vars (gitignored)
├── .env.example                       # Env var template
├── drizzle.config.ts                  # Drizzle Kit config (uses DIRECT_URL)
├── playwright.config.ts               # Playwright: webServer + baseURL + globalSetup
├── vite.config.ts                     # Vite: proxy /api → :3000
├── Dockerfile                         # Multi-stage: deps → builder → runner (alpine)
└── docker-compose.yml                 # Single-service compose
```

---

## Database Schema

All columns use **camelCase** naming (must be quoted in raw SQL).

### Core Tables

| Table | Description | Key Columns |
|---|---|---|
| `users` | Auth users | `id`, `openId`, `name`, `email`, `passwordHash`, `role` (`user`/`admin`), `avatarUrl` |
| `channels` | 1 channel per user | `id`, `userId`, `name`, `nameNorm`, `avatarUrl`, `bannerUrl`, `subscriberCount` |
| `videos` | Video metadata | `id`, `channelId`, `title`, `titleNorm`, `videoUrl`, `thumbnailUrl`, `duration`, `viewCount`, `likeCount`, `dislikeCount`, `commentCount`, `category`, `isPublished` |
| `comments` | Video comments | `id`, `videoId`, `userId`, `content` |
| `likes` | Like/dislike per user per video | `id`, `videoId`, `userId`, `type` (`like`/`dislike`) |
| `subscriptions` | Channel subscriptions | `id`, `channelId`, `userId` |
| `watchHistory` | View tracking + duration | `id`, `videoId`, `userId`, `watchedAt`, `watchDuration` |

### Feature Tables

| Table | Description |
|---|---|
| `playlists` | User playlists (`videoCount` auto-updated by trigger) |
| `playlistVideos` | Videos in playlists (ordered by `position`) |
| `tags` | Video tags |
| `videoTags` | Many-to-many videos ↔ tags |
| `notifications` | User notifications (`new_video`, `new_subscriber`, `comment`, `reply`, `system`) |
| `reports` | Video/comment reports (`pending`/`reviewed`/`resolved`/`dismissed`) |
| `passwordResets` | Reset tokens (64 chars, TTL 15 min) |

### Livestream Tables

| Table | Description |
|---|---|
| `livestreams` | Stream session: `status` (`live`/`ended`), `viewerCount`, `videoUrl` (recording) |
| `livestreamSignals` | WebRTC signaling: viewer `offer` + streamer `answer` |
| `liveChats` | Real-time chat messages |

### Database Triggers (atomic counter maintenance)

| Trigger | Source Table | Updates |
|---|---|---|
| `trg_likes_update_video_counts` | `likes` INSERT/DELETE/UPDATE | `videos.likeCount` / `dislikeCount` |
| `trg_comments_update_video_count` | `comments` INSERT/DELETE | `videos.commentCount` |
| `trg_subscriptions_update_channel_count` | `subscriptions` INSERT/DELETE | `channels.subscriberCount` |
| `trg_playlist_videos_update_count` | `playlistVideos` INSERT/DELETE | `playlists.videoCount` + `updatedAt` |

> Do NOT add manual counter increments in application code — triggers handle all counter updates atomically.

### Entity Relationships

```
users ──1:1──► channels ──1:N──► videos
  │                                 │
  ├──1:N──► comments ──────────────►┘
  ├──1:N──► likes ─────────────────►┘
  ├──1:N──► subscriptions ──────────► channels
  ├──1:N──► watchHistory ───────────► videos
  ├──1:N──► playlists ──1:N──► playlistVideos ──► videos
  ├──1:N──► notifications
  └──1:N──► reports

videos ──N:M──► tags  (via videoTags)
channels ──1:N──► livestreams ──1:N──► livestreamSignals
                                   └──1:N──► liveChats
```

---

## Setup & Workflow

### Environment Variables (`.env`)

```env
# PostgreSQL — Supabase
DATABASE_URL=postgresql://postgres.<ref>:[password]@aws-X-<region>.pooler.supabase.com:6543/postgres
DIRECT_URL=postgresql://postgres.<ref>:[password]@aws-X-<region>.pooler.supabase.com:5432/postgres
JWT_SECRET=your-secret-minimum-32-chars
NODE_ENV=development
CLIENT_URL=http://localhost:3000

# Optional — Supabase Storage (upload videos/images to cloud)
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_jwt>
SUPABASE_BUCKET=videos

# Optional — AI Chatbot (fallback to keyword matching if absent)
GROQ_API_KEY=gsk_...
```

> `DATABASE_URL` must point to transaction pooler **port 6543** — prevents `EMAXCONNSESSION` with connection hot-reload.
> `DIRECT_URL` must point to session pooler **port 5432** — required for `drizzle-kit push` (DDL operations reject transaction pooler).

### First-time Setup (fresh DB)

```bash
# 1. Install dependencies
npx pnpm@10.4.1 install

# 2. Create all tables from scratch
npm run db:setup

# 3. Apply counter triggers
npm run db:triggers

# 4. Seed mock data
npm run seed

# 5. Start dev server
npm run dev
# → http://localhost:3000
```

### Patch Existing DB (no data loss)

```bash
npm run db:migrate   # Adds missing columns/tables using IF NOT EXISTS
```

### Commands Reference

```bash
npm run dev          # Start dev server (frontend + backend, hot reload)
npm run build        # Production build: Vite (client) + esbuild (server → dist/)
npm run start        # Run production build
npm run seed         # Seed database with mock data
npm run test         # Vitest unit tests
npm run test:api     # Playwright API integration tests (45 tests)
npm run test:api:ui  # Playwright UI mode (visual trace viewer)
npm run db:push      # drizzle-kit push — sync schema.ts to DB (uses DIRECT_URL)
npm run db:setup     # Drop + recreate all tables (destructive!)
npm run db:migrate   # Safe patch — add missing columns/tables
npm run db:triggers  # Apply PostgreSQL counter triggers
```

### Docker (no Node/pnpm required)

```bash
docker-compose up --build    # First run (~5–10 min build)
docker-compose up -d         # Background mode
docker-compose down          # Stop
```

Access at **http://localhost:3000**. DB is Supabase external — configure `.env` before starting.

---

## Architecture

### Request Flow

```
Browser
  │
  ├── Static assets ──► Vite dev server (dev) / Express static dist/public/ (prod)
  │
  └── API calls
        │
        ├── POST /api/auth/login  ──► localAuth.ts (bcrypt verify → JWT)
        │
        ├── POST /api/upload-file ──► Express raw body (50MB)
        │                               └── storage.ts
        │                                     ├── Supabase Storage (if env vars set)
        │                                     └── server/uploads/ (local fallback)
        │
        └── /trpc/*  ──► tRPC router (routers.ts) ──► db.ts ──► Supabase PostgreSQL
```

### tRPC Middleware Levels

| Middleware | Guard |
|---|---|
| `publicProcedure` | No auth required |
| `protectedProcedure` | Valid JWT required (`Authorization: Bearer` header, then cookie) |
| `adminProcedure` | `user.role === "admin"` required |

### Auth Flow

1. `POST /api/auth/login` — validates email + bcrypt password hash, issues JWT
2. JWT saved to **cookie** (shared across tabs) AND `sessionStorage[vs_session_token]` (per-tab)
3. tRPC client sends `Authorization: Bearer <token>` header on every request
4. Server reads header first, falls back to cookie — each tab can hold a different account

### Video Upload Flow

1. User selects file → `extractFirstFrame()` auto-generates thumbnail via Canvas API (no ffmpeg)
2. `POST /api/upload-file?key=videos/...&mimeType=...` — raw binary upload (bypasses tRPC JSON limit)
3. `storagePut()` routes to: Supabase Storage (public bucket) → `server/uploads/` fallback
4. `videos.create` tRPC mutation saves all metadata + URLs to DB

### Livestream Flow

```
Streamer (GoLive.tsx)                      Viewer (LiveWatch.tsx)
  │                                               │
  ├── livestreams.start (tRPC)                    ├── livestreamSignals.sendOffer (tRPC)
  ├── getUserMedia (camera + mic)                 ├── poll getViewerSignals every 500ms
  ├── RTCPeerConnection + 5 STUN servers          │
  ├── ICE gathering (4s timeout)                  ├── RTCPeerConnection ──► P2P stream
  ├── livestreamSignals.sendAnswer (tRPC)         │
  ├── MediaRecorder (webm, 5s chunks)             └── live video in <video> element
  └── on stop:
        └── POST /api/upload-file (blob)
              └── livestreams.saveRecording (tRPC)
                    └── /replay/:id available
```

### AI Chatbot RAG Flow

```
User message
  │
  ├── 1. searchVideos(userMsg, 8)  ──► DB (title/titleNorm/channel/description ILIKE)
  │
  ├── 2. Build context:
  │       "videoId=X | title='...' | channel='...' | category=..."
  │
  ├── 3. Groq llama-3.3-70b-versatile (temperature=0.2)
  │       ──► selects relevant videoIds from candidates
  │
  └── 4. Return { message: string, videos: VideoResult[] }
           └── Frontend renders video cards inline in chat bubble
```

Short follow-up messages ("ok", "send") are detected by regex and fall back to the last message with a real keyword, keeping context across turns.

---

## Features

### Video Platform
- Home feed, trending, category, and tag pages
- Video upload (50MB limit) with auto-thumbnail from first frame
- Like/dislike, comments with emoji picker, subscribe/unsubscribe
- Watch history (deduplicated — one entry per video, most recent)
- Resume playback — saves position every 10s to localStorage, restores within 24h
- Progress bar on thumbnails (home feed + history page)
- Playlists (CRUD + Save-to-Playlist dialog on VideoCard hover)
- Tags + category browsing
- Fuzzy search with Vietnamese diacritic normalization (`titleNorm`/`nameNorm`)
- Autocomplete search dropdown (debounced 300ms, triggers at ≥2 chars)
- Notifications (bell dropdown + full `/notifications` page)
- Video/comment reporting
- Share video (Web Share API with clipboard fallback + toast)

### Channel
- Customizable avatar (circular crop) and banner (16:4 crop)
- Video management — delete own videos with confirmation
- Livestream history tab with replay link if recording exists
- Self-subscription guard (backend + frontend)
- Channel name auto-syncs when display name changes in Settings

### Live Streaming
- Browser-based WebRTC P2P (no media server required)
- Automatic recording via `MediaRecorder` → Supabase Storage
- Replay page at `/replay/:id`
- Real-time chat (polling 500ms, up to 4–5s connection time with 5 STUN servers)

### Admin Panel (`/admin`)
- Platform statistics dashboard
- User list with role assignment (cannot self-demote)
- Report queue: review + delete video/comment actions

### UX
- Dark mode toggle (persisted to `localStorage`)
- i18n: **日本語** (default) / Tiếng Việt / English
- Language switcher in TopNavigation + Settings page
- Per-tab session isolation — different accounts per tab
- Optimistic UI updates for likes, subscribe, comments, notifications
- Animated landing page for guests (IntersectionObserver scroll-reveal)
- Sidebar state persisted across navigation

---

## Conventions & Gotchas

- **Package manager**: always use `npx pnpm@10.4.1` — mixing with `npm install` corrupts `pnpm-lock.yaml` → Railway deploy fails
- **Counter updates**: handled exclusively by PostgreSQL triggers — never add manual `count++` in `db.ts`
- **Search normalization**: call `normalizeVi()` whenever creating/updating `videos.title` or `channels.name` to keep `titleNorm`/`nameNorm` in sync
- **`DIRECT_URL` is required** for `drizzle-kit push` — transaction pooler (6543) rejects DDL statements
- **`supabase-setup.sql` must stay in sync** with `drizzle/schema.ts` — after adding a column, update both files plus `migrate-add-missing-columns.mjs`
- **Emoji picker Shadow DOM**: use `e.composedPath()` for click-outside detection, not `element.contains(e.target)`
- **Double-submit guard**: use `useRef(false)` instead of `isPending` — ref blocks synchronously before React's next render cycle
- **SVG gradient IDs**: each instance of the logo SVG in the DOM needs a unique gradient `id` to avoid the first instance overriding all others
- **Triggers must be re-applied** after `db:setup` — they are dropped with the tables
