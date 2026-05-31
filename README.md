<div align="center">

# VideoShare

**Full-stack YouTube-like video sharing platform**

[![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![tRPC](https://img.shields.io/badge/tRPC-11-398ccb?logo=trpc&logoColor=white)](https://trpc.io)
[![Drizzle](https://img.shields.io/badge/Drizzle_ORM-PostgreSQL-c5f74f?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL_+_Storage-3ecf8e?logo=supabase&logoColor=white)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-7-646cff?logo=vite&logoColor=white)](https://vite.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-38bdf8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Playwright](https://img.shields.io/badge/Tests-45_API_tests-45ba4b?logo=playwright&logoColor=white)](https://playwright.dev)

Monorepo React + Vite frontend — Express + tRPC backend — Drizzle ORM + Supabase PostgreSQL.
Supports video upload, live streaming with recording, AI-powered chatbot, multilingual UI (VI/EN/JA), and a full admin panel.

[Quick Start](#quick-start) · [Architecture](#architecture) · [Features](#features) · [API & tRPC](#api--trpc-routes) · [Testing](#testing) · [Deployment](#deployment)

</div>

---

## Table of Contents

1. [Overview](#overview)
2. [Features](#features)
3. [Tech Stack](#tech-stack)
4. [Directory Structure](#directory-structure)
5. [Database Schema](#database-schema)
6. [Quick Start](#quick-start)
7. [Environment Variables](#environment-variables)
8. [Commands Reference](#commands-reference)
9. [Architecture](#architecture)
10. [API & tRPC Routes](#api--trpc-routes)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [Conventions & Gotchas](#conventions--gotchas)

---

## Overview

VideoShare is a production-ready, full-featured video-sharing platform built as a single-repo full-stack TypeScript application. It covers the full user journey: browsing the home feed, uploading videos, live streaming with automatic recording, managing playlists, commenting with emoji, and receiving real-time notifications — all in three languages.

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

## Features

### 📺 Video Platform
- **Home feed** with trending, category, and tag pages
- **Video upload** (50 MB limit) — auto-generates thumbnail from first frame via Canvas API (no ffmpeg)
- **Like / Dislike** with optimistic UI updates
- **Comments** — emoji picker (offline `@emoji-mart/react`, Shadow DOM compatible), optimistic rendering, double-submit guard
- **Subscribe / Unsubscribe** with self-subscription guard (backend + frontend)
- **Watch history** — deduplicated per video, most-recent entry only
- **Resume playback** — position saved every 10 s to `localStorage`, restored within 24 h; progress bar on thumbnails across Home, Channel, and History
- **Playlists** — CRUD + Save-to-Playlist dialog on VideoCard hover
- **Share video** — Web Share API with clipboard fallback + toast notification

### 🔍 Search
- **Fuzzy full-text search** — token-based ILIKE on title, description, and channel name; relevance scoring (title exact match → phrase → token → channel → description)
- **Vietnamese diacritic normalization** — `"honganh"` matches `"Hồng Anh"` via `normalizeVi()` + `titleNorm`/`nameNorm` indexed columns
- **Autocomplete dropdown** — debounced 300 ms, triggers at ≥ 2 characters

### 📡 Live Streaming
- **WebRTC P2P** — browser-based, no media server required; 5 STUN servers for faster ICE gathering (4 s timeout)
- **Automatic recording** via `MediaRecorder` (webm) — uploaded to Supabase Storage on stream end
- **Replay page** at `/replay/:id` — video player + peak viewers + duration metadata
- **Real-time live chat** — polling 500 ms latency
- **Livestream history tab** on Channel page — replay link if recording exists

### 🤖 AI Chatbot (RAG)
- Floating widget on every page, powered by **Groq** `llama-3.3-70b-versatile` (free tier)
- RAG architecture: `searchVideos(query, 8)` → candidates → Groq selects relevant IDs → returns `{ message, videos[] }` directly
- Inline video card rendering inside chat bubbles — no extra API calls from the frontend
- Follow-up detection via regex — short procedural messages fall back to the last real-keyword turn
- Graceful keyword-matching fallback when `GROQ_API_KEY` is absent

### 🎨 Channel & Profile
- **Avatar** (circular 1:1 crop) and **banner** (16:4 crop) upload via `react-easy-crop` — zoom slider, pan, JPEG 92% export
- **Delete own videos** with ownership guard and confirmation dialog
- **Channel name auto-sync** when display name changes in Settings

### 👤 Auth
- Email + bcrypt password (minimum 6 characters)
- JWT stored in **shared cookie** AND `sessionStorage[vs_session_token]` per tab — each tab can hold a different logged-in account
- **Forgot password** — OTP flow: 6-digit code sent via **SMTP** (nodemailer), TTL 10 min, single-active OTP per email, invalidated on use
- Auth state hydrated from `localStorage` on first render to prevent flash

### 🛡️ Admin Panel (`/admin`)
- Platform statistics dashboard (users, videos, subscriptions, reports)
- User management — role assignment (`user` / `admin`), self-demotion blocked
- Report queue — review and delete flagged videos or comments

### 🌐 Internationalization
- **3 languages**: Tiếng Việt / English / 日本語 (23 namespaces, ~600 keys each)
- Language switcher in TopNavigation + Settings; persisted to `localStorage`
- Dynamic `date-fns` locale via `useDateLocale()` hook — formatted dates change without page reload
- AI chatbot replies in the user's currently selected language

### 🎛️ UX
- **Dark mode** — global semantic tokens, persisted to `localStorage`
- **Per-tab session isolation** — independent login sessions per browser tab
- **Optimistic updates** — likes, subscribe, comments, and notifications update immediately, roll back on error
- **Animated landing page** for guests — IntersectionObserver scroll-reveal sections
- **Sidebar state** persisted across navigation (localStorage)
- **Bell notification dropdown** — 10 most recent, mark-as-read, mark-all, link to full page

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 7, TanStack Query v5, Tailwind CSS v4, Wouter (routing) |
| **Backend** | Express 4, tRPC v11 (server) |
| **API layer** | tRPC — end-to-end type-safe procedures, no REST boilerplate |
| **ORM** | Drizzle ORM (PostgreSQL dialect, `postgres.js` driver) |
| **Database** | Supabase PostgreSQL — transaction pooler `:6543` (runtime), session pooler `:5432` (migrations) |
| **Auth** | bcrypt password hashing · JWT in cookie + sessionStorage · per-tab isolation |
| **Storage** | Supabase Storage (primary) → `server/uploads/` (local disk fallback) |
| **Email** | Gmail SMTP via nodemailer → console log fallback |
| **AI / LLM** | Groq `llama-3.3-70b-versatile` — RAG chatbot with video candidate injection |
| **Live Stream** | WebRTC P2P + polling-based tRPC signaling · `MediaRecorder` for recording |
| **i18n** | `react-i18next` + `i18next` — VI / EN / JA |
| **Image Crop** | `react-easy-crop` — circular avatar (1:1) + rectangular banner (16:4) |
| **Emoji** | `@emoji-mart/react` + `@emoji-mart/data` — offline, Shadow DOM aware |
| **Tests** | Vitest (unit) + Playwright (API integration, 45 tests) |
| **Build** | Vite (frontend → `dist/public/`) + esbuild (backend → `dist/index.js`) |
| **Container** | Docker multi-stage: `deps` → `builder` → `runner` (alpine slim) |

---

## Directory Structure

```
video-sharing-platform/
├── client/                              # React + Vite frontend
│   ├── public/
│   │   └── favicon.svg                 # Film strip + play button SVG logo (gradient green)
│   └── src/
│       ├── _core/
│       │   └── hooks/
│       │       └── useAuth.ts          # Auth state — isAuthReady, placeholderData, logout
│       ├── components/
│       │   ├── ImageCropDialog.tsx     # Avatar/banner crop dialog (react-easy-crop)
│       │   ├── Layout.tsx             # App shell — mounts VideoChatBot globally
│       │   ├── SaveToPlaylistDialog.tsx # Add-to-playlist dropdown with inline create
│       │   ├── Sidebar.tsx            # Collapsible sidebar, state persisted to localStorage
│       │   ├── TopNavigation.tsx      # Bell dropdown + language switcher + autocomplete search
│       │   ├── VideoChatBot.tsx       # Floating AI chatbot (Groq RAG, bottom-right)
│       │   ├── VideoCard.tsx          # Thumbnail + watch progress bar + save/delete hover actions
│       │   └── VideoPlayer.tsx        # HTML5 player — autoplay, resume playback, seek guard
│       ├── lib/
│       │   ├── i18n.ts                # i18next config — LANGUAGES constant, Language type
│       │   └── useDateLocale.ts       # date-fns locale hook (vi / enUS / ja)
│       ├── locales/
│       │   ├── vi.ts                  # Tiếng Việt — 23 namespaces, ~600 keys
│       │   ├── en.ts                  # English
│       │   └── ja.ts                  # 日本語
│       └── pages/
│           ├── admin/
│           │   ├── AdminDashboard.tsx  # Platform stats
│           │   ├── AdminUsers.tsx      # User list + role assignment
│           │   └── AdminReports.tsx    # Report queue — review + delete
│           ├── Landing.tsx            # Animated hero for unauthenticated users
│           ├── Home.tsx               # Feed + VideoCard grid
│           ├── Watch.tsx              # Player + comments + emoji picker + share
│           ├── Channel.tsx            # Channel profile + video/livestream tabs + crop upload
│           ├── Upload.tsx             # Drag-drop upload + Canvas auto-thumbnail
│           ├── Search.tsx             # Search results
│           ├── Trending.tsx           # Top videos by view count
│           ├── History.tsx            # Watch history (deduplicated)
│           ├── Notifications.tsx      # All notifications
│           ├── Playlists.tsx          # Playlist management
│           ├── PlaylistDetail.tsx     # Videos within a playlist
│           ├── Profile.tsx            # User profile
│           ├── Settings.tsx           # Dark mode toggle + language picker
│           ├── GoLive.tsx             # Streamer: camera preview + MediaRecorder + WebRTC
│           ├── LiveWatch.tsx          # Viewer: WebRTC player + live chat
│           ├── Replay.tsx             # Recorded livestream replay (/replay/:id)
│           ├── Register.tsx           # Registration form (email + name + password)
│           ├── Login.tsx              # Login form
│           ├── ForgotPassword.tsx     # OTP-based forgot password (abort after 12 s)
│           ├── ResetPassword.tsx      # Set new password with OTP
│           ├── Help.tsx               # Searchable FAQ (8 categories)
│           ├── Tag.tsx                # Videos by tag (maps slugs to categories)
│           └── Category.tsx           # Videos by category
│
├── server/
│   ├── _core/
│   │   ├── index.ts                   # Express app entry — static serve + prod esbuild build
│   │   ├── trpc.ts                    # publicProcedure / protectedProcedure / adminProcedure
│   │   ├── localAuth.ts               # POST /api/auth/login|forgot-password|reset-password-otp
│   │   ├── email.ts                   # sendResetPasswordOtp — SMTP (nodemailer) → console fallback
│   │   ├── sdk.ts                     # JWT session auth + local vs OAuth session detection
│   │   ├── env.ts                     # Env var access helpers
│   │   └── storageProxy.ts            # Express static: serve /uploads/* (local disk)
│   ├── db.ts                          # All DB queries via Drizzle ORM (lazy singleton)
│   ├── routers.ts                     # All tRPC routers: videos, channels, auth, admin, livestreams, ai
│   ├── storage.ts                     # storagePut(): Supabase Storage > local disk fallback
│   ├── setup-db.mjs                   # Drop + recreate all tables from supabase-setup.sql
│   ├── migrate-add-missing-columns.mjs # Safe patch — adds missing columns/tables (IF NOT EXISTS)
│   ├── setup-triggers.mjs             # Apply 4 PostgreSQL counter triggers
│   └── seed-data.mjs                  # 5 channels, 20 videos (public domain), 6 users
│
├── drizzle/
│   ├── schema.ts                      # PostgreSQL schema — single source of truth
│   ├── supabase-setup.sql             # Full CREATE TABLE SQL (mirrors schema.ts, used by db:setup)
│   └── triggers.sql                   # Counter trigger SQL reference
│
├── shared/
│   ├── const.ts                       # COOKIE_NAME, SESSION_KEY (shared client/server)
│   └── normalize.ts                   # normalizeVi() — NFD decompose + strip diacritics for search
│
├── tests/
│   └── api/
│       ├── global-setup.ts            # Create Playwright test accounts before suite runs
│       ├── helpers.ts                 # login(), tGet(), tPost() with superjson unwrap
│       ├── auth.spec.ts               # 16 auth endpoint tests
│       ├── videos.spec.ts             # 17 video endpoint tests
│       └── channels.spec.ts           # 12 channel/subscription/playlist tests
│
├── .env                               # Local env vars (gitignored)
├── .env.example                       # Env var template
├── drizzle.config.ts                  # Drizzle Kit config (uses DIRECT_URL for DDL)
├── playwright.config.ts               # Playwright: webServer auto-start + baseURL + globalSetup
├── vite.config.ts                     # Vite: proxy /api → :3000 in dev
├── Dockerfile                         # Multi-stage: deps → builder (Vite+esbuild) → runner (alpine)
└── docker-compose.yml                 # Single-service compose, volume for uploads
```

---

## Database Schema

All column names use **camelCase** (must be quoted in raw SQL, e.g. `"channelId"`).

### Core Tables

| Table | Description | Key Columns |
|---|---|---|
| `users` | Auth users | `id`, `openId`, `name`, `email`, `passwordHash`, `role` (`user`/`admin`), `avatarUrl` |
| `channels` | One channel per user | `id`, `userId`, `name`, `nameNorm`, `avatarUrl`, `bannerUrl`, `subscriberCount` |
| `videos` | Video metadata + counters | `id`, `channelId`, `title`, `titleNorm`, `videoUrl`, `thumbnailUrl`, `duration`, `viewCount`, `likeCount`, `dislikeCount`, `commentCount`, `category`, `isPublished` |
| `comments` | Video comments | `id`, `videoId`, `userId`, `content`, `createdAt` |
| `likes` | Like/dislike per user per video | `id`, `videoId`, `userId`, `type` (`like`/`dislike`) |
| `subscriptions` | Channel subscriptions | `id`, `channelId`, `userId` |
| `watchHistory` | View tracking + watch position | `id`, `videoId`, `userId`, `watchedAt`, `watchDuration` |

### Feature Tables

| Table | Description |
|---|---|
| `playlists` | User playlists — `videoCount` auto-updated by trigger |
| `playlistVideos` | Videos in playlists, ordered by `position` |
| `tags` | Named video tags |
| `videoTags` | Many-to-many `videos ↔ tags` |
| `notifications` | User notifications: `new_video`, `new_subscriber`, `comment`, `reply`, `system` |
| `reports` | Video/comment reports — `pending` / `reviewed` / `resolved` / `dismissed` |
| `emailOtps` | OTP codes (6 digits, TTL 10 min, purpose = `reset-password`) |
| `passwordResets` | Legacy token-based resets (kept for backwards compat, not used in UI) |

### Livestream Tables

| Table | Description |
|---|---|
| `livestreams` | Stream session: `status` (`live`/`ended`), `viewerCount`, `videoUrl` (recording URL) |
| `livestreamSignals` | WebRTC signaling: viewer `offer` + streamer `answer` |
| `liveChats` | Real-time chat messages during a stream |

### PostgreSQL Triggers (atomic counter maintenance)

| Trigger | Source Table | Maintains |
|---|---|---|
| `trg_likes_update_video_counts` | `likes` INSERT/DELETE/UPDATE(type) | `videos.likeCount` + `videos.dislikeCount` |
| `trg_comments_update_video_count` | `comments` INSERT/DELETE | `videos.commentCount` |
| `trg_subscriptions_update_channel_count` | `subscriptions` INSERT/DELETE | `channels.subscriberCount` |
| `trg_playlist_videos_update_count` | `playlistVideos` INSERT/DELETE | `playlists.videoCount` + `playlists.updatedAt` |

> **Never** add manual counter increments in `db.ts` — all counter updates are handled atomically by the triggers above.

### Entity Relationships

```
users ─────1:1──► channels ──1:N──► videos
  │                                    │
  ├──1:N──► comments ─────────────────►┘
  ├──1:N──► likes ────────────────────►┘
  ├──1:N──► subscriptions ─────────────► channels
  ├──1:N──► watchHistory ──────────────► videos
  ├──1:N──► playlists ──1:N──► playlistVideos ──► videos
  ├──1:N──► notifications
  ├──1:N──► reports
  └──1:N──► emailOtps

videos ──N:M──► tags  (via videoTags)
channels ──1:N──► livestreams ──1:N──► livestreamSignals
                                   └──1:N──► liveChats
```

---

## Quick Start

### Option A — Local Dev (Node.js)

```bash
# 1. Clone and install dependencies (always use pnpm to keep lockfile valid)
git clone <repo-url> && cd video-sharing-platform
npx pnpm@10.4.1 install

# 2. Copy and fill environment variables
cp .env.example .env
# → Edit .env: set DATABASE_URL, DIRECT_URL, JWT_SECRET (minimum 32 chars)

# 3. First-time database setup
npm run db:setup     # Drop + create all tables
npm run db:triggers  # Apply 4 counter triggers
npm run seed         # Seed 5 channels, 20 videos, 6 users

# 4. Start the dev server
npm run dev
# → http://localhost:3000
```

### Option B — Docker (no Node/pnpm required)

```bash
cp .env.example .env   # Fill in DATABASE_URL, JWT_SECRET, etc.

docker-compose up --build   # First run (~5–10 min)
docker-compose up -d        # Background mode (subsequent runs)
docker-compose down         # Stop
```

Access at **http://localhost:3000**. The database is external (Supabase) — `db:setup` and `seed` must still be run against your Supabase instance before first use.

### Patch an Existing DB (no data loss)

```bash
npm run db:migrate   # Adds only missing columns/tables via IF NOT EXISTS
```

---

## Environment Variables

Copy `.env.example` → `.env` and fill in the values below.

```env
# ─── PostgreSQL (Supabase) ─────────────────────────────────────────────────
# Transaction pooler :6543 — used for all runtime queries (avoids EMAXCONNSESSION)
DATABASE_URL=postgresql://postgres.<ref>:[password]@aws-X-<region>.pooler.supabase.com:6543/postgres

# Session pooler :5432 — used only by drizzle-kit for DDL (db:push, db:setup)
DIRECT_URL=postgresql://postgres.<ref>:[password]@aws-X-<region>.pooler.supabase.com:5432/postgres

# ─── App ──────────────────────────────────────────────────────────────────
JWT_SECRET=your-secret-minimum-32-characters
NODE_ENV=development            # or "production"
CLIENT_URL=http://localhost:3000

# ─── Supabase Storage (optional — falls back to local disk) ───────────────
SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_KEY=<service_role_jwt>   # NOT the anon key
SUPABASE_BUCKET=videos                    # must be set to Public in Supabase dashboard

# ─── Email / SMTP (optional — falls back to console log) ─────────────────
SMTP_HOST=smtp.gmail.com                 # default: smtp.gmail.com
SMTP_PORT=465                            # default: 465 (SSL)
SMTP_USER=you@gmail.com                  # Gmail address
SMTP_PASS=xxxx xxxx xxxx xxxx           # Gmail App Password (16 chars)
SMTP_FROM_EMAIL=you@gmail.com            # optional — defaults to SMTP_USER
SMTP_FROM_NAME=VideoShare                # optional sender display name

# ─── AI Chatbot (optional — falls back to keyword matching) ───────────────
GROQ_API_KEY=gsk_...
```

**Connection URL notes:**
- `DATABASE_URL` **must** use transaction pooler port **6543** — the session pooler causes `EMAXCONNSESSION` when `tsx watch` spawns multiple processes during hot-reload.
- `DIRECT_URL` **must** use session pooler port **5432** (or a direct connection) — DDL statements (`CREATE TABLE`, `ALTER TABLE`) are rejected by the transaction pooler.
- `SUPABASE_SERVICE_KEY` must be the `service_role` JWT, not the `anon` key.
- Supabase Storage bucket must be set to **Public** for video URLs to be directly accessible.

---

## Commands Reference

```bash
# ─── Development ──────────────────────────────────────────────────────────
npm run dev            # Start dev server (frontend + backend, hot reload)
                       # → http://localhost:3000

# ─── Build & Production ───────────────────────────────────────────────────
npm run build          # Build: Vite → dist/public/ + esbuild → dist/index.js
npm run start          # Run production build (NODE_ENV=production)

# ─── Database ─────────────────────────────────────────────────────────────
npm run db:setup       # DROP all tables + recreate from supabase-setup.sql  ⚠️ destructive
npm run db:push        # drizzle-kit push — sync schema.ts to DB (uses DIRECT_URL)
npm run db:migrate     # Safe patch — add missing columns/tables (IF NOT EXISTS)
npm run db:triggers    # Apply 4 PostgreSQL counter triggers (re-run after db:setup)
npm run seed           # Seed: 5 channels, 20 public-domain videos, 6 users

# ─── Testing ──────────────────────────────────────────────────────────────
npm run test           # Vitest unit tests
npm run test:api       # Playwright API integration tests (45 tests, ~20 s)
npm run test:api:ui    # Playwright UI mode — visual trace viewer
```

**Recommended first-run order:**

```bash
npm run db:setup && npm run db:triggers && npm run seed
```

---

## Architecture

### Request Flow

```
Browser
  │
  ├── Static assets ─────► Vite dev server (dev) / Express static dist/public/ (prod)
  │
  └── API calls
        │
        ├── POST /api/auth/login          ─► localAuth.ts (bcrypt verify → JWT cookie + body)
        ├── POST /api/auth/forgot-password ─► email.ts → SMTP / console fallback
        ├── POST /api/auth/reset-password-otp ─► verify OTP → update passwordHash
        │
        ├── POST /api/upload-file         ─► Express raw body (50 MB limit)
        │                                      └── storage.ts
        │                                            ├── Supabase Storage (if env vars set)
        │                                            └── server/uploads/ (local fallback)
        │
        └── /trpc/*   ─► tRPC router (routers.ts) ─► db.ts ─► Supabase PostgreSQL
                           │
                           ├── publicProcedure      (no auth)
                           ├── protectedProcedure   (valid JWT — header first, then cookie)
                           └── adminProcedure       (user.role === "admin")
```

### Auth Flow

```
1. POST /api/auth/login
     → bcrypt.compare(password, user.passwordHash)
     → sign JWT { userId, role }
     → Set-Cookie: vs_session (httpOnly) + return token in body

2. Client stores JWT
     → cookie: shared across tabs
     → sessionStorage[vs_session_token]: isolated per tab

3. Every tRPC request
     → Authorization: Bearer <token> header (from sessionStorage)
     → server reads header first → falls back to cookie
     → each tab can hold a different account simultaneously
```

### Video Upload Flow

```
1. User selects .mp4 / .webm
2. extractFirstFrame() ─► Canvas API → JPEG thumbnail (no ffmpeg, client-side)
3. POST /api/upload-file?key=videos/...&mimeType=video/mp4
     → storagePut(): Supabase Storage → server/uploads/ fallback
4. videos.create (tRPC mutation)
     → INSERT into videos with all metadata + URLs
```

### Forgot Password Flow

```
1. POST /api/auth/forgot-password { email }
     → generate 6-digit OTP, bcrypt hash, store in emailOtps (TTL 10 min)
     → sendResetPasswordOtp(email, otp)
           ├── SMTP via nodemailer (SMTP_USER + SMTP_PASS set)
           └── console.log — fallback when SMTP not configured
     → return 200 (OTP still valid even if email delivery fails)

2. POST /api/auth/reset-password-otp { email, otp, password }
     → verify OTP (bcrypt.compare, TTL check, not-used check)
     → bcrypt.hash(password) → UPDATE users.passwordHash
     → mark OTP as used
```

### Livestream Flow

```
Streamer (GoLive.tsx)                   Viewer (LiveWatch.tsx)
  │                                           │
  ├─ livestreams.start (tRPC)                 ├─ livestreamSignals.sendOffer (tRPC)
  ├─ getUserMedia (camera + mic)              ├─ poll getViewerSignals every 500 ms
  ├─ RTCPeerConnection (5 STUN servers)       │
  ├─ ICE gathering (4 s timeout)             ├─ RTCPeerConnection ──► P2P video stream
  ├─ livestreamSignals.sendAnswer (tRPC)      │
  ├─ MediaRecorder (webm, 5 s chunks)         └─ live video in <video> element
  └─ on stopStream():
       stop recorder → Blob
       → POST /api/upload-file (recordings/livestream-{id}-{ts}.webm)
       → livestreams.saveRecording (tRPC) → stores URL in DB
       → /replay/:id becomes accessible
```

### AI Chatbot RAG Flow

```
User message
  │
  ├── 1. searchVideos(userMsg, 8)  ──► PostgreSQL ILIKE (titleNorm / nameNorm / description)
  │
  ├── 2. Build context string:
  │        "videoId=X | title='...' | channel='...' | category=... | description=..."
  │
  ├── 3. Groq llama-3.3-70b-versatile (temperature=0.2)
  │        system prompt: "select relevant videoIds, never invent titles, say you don't know"
  │        ──► returns { message: string, videoIds: number[] }
  │
  └── 4. Resolve videoIds → VideoResult[] → return { message, videos }
           └── Frontend renders VideoCard tiles inline in chat bubble

  Fallback (no GROQ_API_KEY):
       searchVideos(userMsg, 4) → top results + keyword-matched message
```

---

## API & tRPC Routes

All endpoints live under `/trpc/*` except file upload and local auth.

### REST Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Email + password login, returns JWT |
| `POST` | `/api/auth/forgot-password` | — | Send OTP to email |
| `POST` | `/api/auth/reset-password-otp` | — | Verify OTP + set new password |
| `POST` | `/api/upload-file` | Cookie/Header | Binary file upload (50 MB), returns URL |

### tRPC Routers

#### `videos`
| Procedure | Type | Description |
|---|---|---|
| `list` | query | Paginated home feed |
| `getById` | query | Single video + channel info |
| `suggest` | query | Autocomplete (≥2 chars, max 8 results) |
| `search` | query | Fuzzy search with relevance scoring |
| `trending` | query | Top by view count |
| `getByCategory` | query | Videos filtered by category |
| `getByTag` | query | Videos by tag slug (maps to category) |
| `create` | mutation (protected) | Create video record |
| `delete` | mutation (protected) | Delete own video (ownership check) |
| `incrementView` | mutation | Increment view counter |

#### `channels`
| Procedure | Type | Description |
|---|---|---|
| `getById` | query | Channel profile + stats |
| `getMyChannel` | query (protected) | Own channel |
| `getVideos` | query | Videos for a channel |
| `getLivestreams` | query | Ended livestreams for a channel |
| `updateImages` | mutation (protected) | Update avatar + banner URLs |

#### `comments`
| Procedure | Type | Description |
|---|---|---|
| `list` | query | Comments for a video (includes `channelId` for linking) |
| `create` | mutation (protected) | Post a comment |
| `delete` | mutation (protected) | Delete own comment |

#### `likes`
| Procedure | Type | Description |
|---|---|---|
| `getMyLike` | query (protected) | Current user's like/dislike for a video |
| `toggle` | mutation (protected) | Like, dislike, or remove reaction |

#### `subscriptions`
| Procedure | Type | Description |
|---|---|---|
| `isSubscribed` | query (protected) | Subscription status for a channel |
| `getCount` | query | Subscriber count for a channel |
| `toggle` | mutation (protected) | Subscribe/unsubscribe (blocks self-subscribe) |

#### `watchHistory`
| Procedure | Type | Description |
|---|---|---|
| `list` | query (protected) | Paginated, deduplicated (one per video) |
| `upsert` | mutation (protected) | Record or update a view |
| `updateDuration` | mutation (protected) | Save watch position on leave |
| `clear` | mutation (protected) | Clear all history |

#### `playlists`
| Procedure | Type | Description |
|---|---|---|
| `list` | query (protected) | All user playlists |
| `getById` | query | Playlist + videos |
| `create` | mutation (protected) | Create playlist |
| `delete` | mutation (protected) | Delete playlist |
| `addVideo` | mutation (protected) | Add video to playlist |
| `removeVideo` | mutation (protected) | Remove video from playlist |

#### `notifications`
| Procedure | Type | Description |
|---|---|---|
| `list` | query (protected) | Paginated notifications |
| `unreadCount` | query (protected) | Badge count |
| `markRead` | mutation (protected) | Mark single notification as read |
| `markAllRead` | mutation (protected) | Mark all as read |

#### `livestreams`
| Procedure | Type | Description |
|---|---|---|
| `start` | mutation (protected) | Begin stream, auto-end previous |
| `end` | mutation (protected) | End active stream |
| `getById` | query | Livestream metadata + recording URL |
| `saveRecording` | mutation (protected) | Store Supabase Storage URL after recording |
| `delete` | mutation (protected) | Delete stream + signals + chats (owner only) |
| `sendViewerOffer` | mutation (protected) | Post WebRTC offer (viewer → streamer) |
| `sendAnswer` | mutation (protected) | Post WebRTC answer (streamer → viewer) |
| `getViewerSignals` | query | Poll for pending signals |

#### `ai`
| Procedure | Type | Description |
|---|---|---|
| `chat` | mutation | RAG chatbot: search DB candidates → Groq → `{ message, videos }` |

#### `admin`
| Procedure | Type | Description |
|---|---|---|
| `getStats` | query (admin) | Platform statistics |
| `listUsers` | query (admin) | All users, paginated |
| `setUserRole` | mutation (admin) | Change user role (blocks self-change) |
| `listReports` | query (admin) | All reports |
| `updateReportStatus` | mutation (admin) | Change report status |
| `deleteVideo` | mutation (admin) | Hard delete any video |
| `deleteComment` | mutation (admin) | Hard delete any comment |

---

## Testing

### Playwright API Integration Tests (45 tests)

Tests run against the real HTTP server using `@playwright/test` request context — no browser required.

```bash
npm run test:api        # Run all 45 tests (auto-starts server if not running)
npm run test:api:ui     # Open Playwright UI with trace viewer
```

**Test suites:**

| Suite | File | Tests | Coverage |
|---|---|---|---|
| Auth | `tests/api/auth.spec.ts` | 16 | Login, logout, forgot/reset password OTP, auth.me |
| Videos | `tests/api/videos.spec.ts` | 17 | List, search, suggest, CRUD, comments, likes |
| Channels | `tests/api/channels.spec.ts` | 12 | Channel profile, subscriptions, playlists, user profile |

**Infrastructure:**
- `globalSetup.ts` creates `pw_admin@playwright.test` before the suite runs — no manual setup needed
- `helpers.ts` provides `login()`, `tGet()`, `tPost()` with automatic superjson unwrapping
- `reuseExistingServer: true` — shares the dev server if already running
- Seeded users use password `Password123!` (re-seeded) or `1234567Long` (pre-seed migration)

### Vitest Unit Tests

```bash
npm run test    # Run unit tests
```

Unit tests cover: OTP email logic (mock nodemailer), auth endpoint validation, password hashing.

---

## Deployment

### Railway (recommended)

Required env vars in Railway Variables tab:

```
DATABASE_URL         Transaction pooler :6543
DIRECT_URL           Session pooler :5432 (needed for db:migrate in CI)
JWT_SECRET           ≥32 characters
NODE_ENV             production
CLIENT_URL           https://your-app.railway.app
SUPABASE_URL
SUPABASE_SERVICE_KEY
SUPABASE_BUCKET      videos
SMTP_HOST            default: smtp.gmail.com
SMTP_PORT            default: 465
SMTP_USER            Gmail address for sending OTP emails
SMTP_PASS            Gmail App Password (16 chars, requires 2FA enabled)
SMTP_FROM_EMAIL      Optional sender address (defaults to SMTP_USER)
SMTP_FROM_NAME       Optional sender display name (defaults to VideoShare)
GROQ_API_KEY         Optional — chatbot falls back to keyword matching
```

**Railway gotchas:**
- `PORT` is injected automatically — do **not** set it manually.
- Mount a volume at `/app/server/uploads` if using local storage fallback.
- After first deploy, run `npm run db:migrate` against the live Supabase DB to patch any missing columns.
- Supabase Storage bucket `videos` must be set to **Public**, with file size limit ≥ 50 MB (default cap).

### Docker

```bash
# Build and run
docker-compose up --build

# Environment
cp .env.example .env
# Set DATABASE_URL, DIRECT_URL, JWT_SECRET, SUPABASE_*, SMTP_USER, SMTP_PASS

# Uploads volume is persisted via docker-compose.yml → volume: uploads:/app/server/uploads
```

The multi-stage Dockerfile produces a minimal alpine image:
1. `deps` — install pnpm + all dependencies (frozen lockfile)
2. `builder` — Vite build (→ `dist/public/`) + esbuild server bundle (→ `dist/index.js`)
3. `runner` — alpine, only `dist/` + prod node_modules; no build tools

---

## Conventions & Gotchas

### Package Manager
Always use `npx pnpm@10.4.1` (or `npx pnpm@10.4.1 add <package>`). Mixing with bare `npm install` corrupts `pnpm-lock.yaml` → Railway deploy fails with `ERR_PNPM_OUTDATED_LOCKFILE`.

### Database
- **Counter updates**: handled exclusively by PostgreSQL triggers — never add manual `count++` in `db.ts`.
- **Search columns**: call `normalizeVi()` from `shared/normalize.ts` whenever inserting/updating `videos.title` or `channels.name` to keep `titleNorm`/`nameNorm` in sync.
- **`DIRECT_URL` is required** for `drizzle-kit push` — the transaction pooler rejects DDL.
- **`supabase-setup.sql` must stay in sync** with `drizzle/schema.ts` — after adding a column, update the SQL file **and** add an `IF NOT EXISTS` clause to `migrate-add-missing-columns.mjs`.
- **Triggers are lost after `db:setup`** — always run `npm run db:triggers` immediately after.
- **Drizzle `select()` reads all schema columns** — if a column exists in `schema.ts` but not in the actual DB, the entire table's queries will fail. When in doubt, run `db:migrate`.

### Frontend
- **Emoji picker Shadow DOM**: use `e.composedPath()` for click-outside detection — `element.contains(e.target)` does not pierce shadow roots.
- **Double-submit guard**: use `isSubmittingRef = useRef(false)` instead of `isPending` — refs block synchronously before React's next render cycle.
- **SVG gradient IDs**: each inline SVG instance in the same DOM needs a unique `id` for its gradient — duplicate IDs cause the first gradient to override all others.
- **`useDateLocale()`**: always use this hook for `date-fns` formatting — direct `{ locale: vi }` imports won't change when the user switches language.
- **`isAuthReady` flag**: use this (not `isAuthenticated`) anywhere a render must wait for server confirmation before showing auth-dependent UI — avoids flash of wrong content.

### Auth & Sessions
- **Per-tab isolation**: JWT in `sessionStorage[vs_session_token]` is per-tab. The shared cookie is the fallback. Server reads `Authorization: Bearer` header first.
- **`passwordHash` is nullable** for future OAuth/social login users. Always guard with `if (!user.passwordHash) throw UnauthorizedException` before `bcrypt.compare`.
- **OTP flow**: one active OTP per `(email, purpose)` — old OTP is deleted when a new one is created. OTP is marked used immediately on successful verify.

### Livestreaming
- **WebRTC works best on the same LAN or network** — STUN only, no TURN server. Connections may fail across different NATs (`connState === "failed"` → Retry button shown).
- **Signaling polling 500 ms**: max ~500 ms delay for viewer to receive streamer's answer. Total connection time ~4–5 s.
- **`livestreams` auto-ends previous stream**: `startLivestream()` sets `status = 'ended'` on any existing active stream for the channel before inserting a new one.

### Email
- Gửi OTP qua SMTP (nodemailer). Nếu `SMTP_USER` / `SMTP_PASS` chưa set, OTP được log ra console — request vẫn trả 200 và OTP vẫn hợp lệ trong DB.
- Gmail App Password **bắt buộc** nếu tài khoản bật 2FA. Lấy tại `myaccount.google.com/apppasswords`.
- `SMTP_PORT=465` dùng SSL (`secure: true`). Port 587 dùng STARTTLS (`secure: false`) — chỉnh `SMTP_PORT` là đủ, code tự detect.
- **Railway block port 587 và 465** — nếu deploy lên Railway và gặp lỗi SMTP, xem xét dùng một email service khác có HTTPS API.

### Production Build
- esbuild **must** include `--define:process.env.NODE_ENV='"production"'` — this flag enables dead-code elimination of the dev-only Vite middleware branch, preventing `ERR_MODULE_NOT_FOUND: vite` on startup.

---

## License

This project is released under the [MIT License](LICENSE).
