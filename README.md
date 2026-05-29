# VideoShare

A full-stack video sharing platform built with React, tRPC, and Supabase PostgreSQL.

## Features

- **Video upload & streaming** — upload videos with auto-generated thumbnails, watch with autoplay
- **Channels** — every user gets a channel with custom avatar, banner, and subscriber count
- **Live streaming** — WebRTC P2P live broadcast with real-time chat
- **Social** — likes/dislikes, comments, subscriptions, playlists, watch history
- **Search** — fuzzy search with autocomplete suggestions
- **Notifications** — bell dropdown with real-time notification feed
- **Admin panel** — user management, role assignment, content moderation
- **Dark mode** — persistent theme preference
- **Per-tab sessions** — each browser tab can be logged into a different account

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, Tailwind CSS, TanStack Query, wouter |
| Backend | Express, tRPC, Drizzle ORM |
| Database | Supabase PostgreSQL |
| Auth | Email + password (bcrypt), JWT in cookie + sessionStorage |
| Storage | Local disk (dev) / S3-compatible (prod) |
| Real-time | WebRTC P2P (livestream), polling (signaling) |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier is enough)

### Installation

```bash
# Install dependencies
npm install

# Copy env file and fill in values
cp .env.example .env
# Edit .env with your Supabase credentials and JWT secret

# Set up the database
npm run db:setup      # Create all tables
npm run seed          # Seed with demo data
npm run db:triggers   # Apply counter triggers (run once after db:setup)

# Start the dev server
npm run dev           # http://localhost:3000
```

### Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase Transaction Pooler URL (port 6543) |
| `DIRECT_URL` | Yes | Supabase Session Pooler URL (port 5432) — used by `db:push` |
| `JWT_SECRET` | Yes | Random string ≥ 32 chars for signing session tokens |
| `PORT` | No | Server port (default: `3000`) |
| `CLIENT_URL` | No | Frontend URL for CORS + password reset links (default: `http://localhost:5173`) |
| `BUILT_IN_FORGE_API_URL` | No | S3-compatible storage endpoint (falls back to local disk) |
| `BUILT_IN_FORGE_API_KEY` | No | Storage API key |

For client-side variables, copy `client/.env.example` to `client/.env`.

### Demo Accounts

After running `npm run seed`:

| Email | Password | Role |
|-------|----------|------|
| `admin@example.com` | `Admin123!` | Admin |
| `alice@example.com` | `Password123!` | User |
| `bob@example.com` | `Password123!` | User |

## Scripts

```bash
npm run dev           # Start dev server (frontend + backend)
npm run build         # Production build
npm run seed          # Seed database with demo data
npm run db:push       # Apply schema changes to database
npm run db:setup      # Drop and recreate all tables
npm run db:triggers   # Apply PostgreSQL counter triggers
npm run test          # Run Vitest tests
```

## Project Structure

```
├── client/               # React frontend (Vite)
│   ├── src/
│   │   ├── pages/        # Page components
│   │   ├── components/   # Reusable UI components
│   │   ├── _core/        # Auth hooks, tRPC client
│   │   └── contexts/     # Theme context
│   └── .env.example
├── server/               # Express backend
│   ├── _core/            # Auth, tRPC setup, middleware
│   ├── db.ts             # All database queries
│   ├── routers.ts        # All tRPC routes
│   ├── storage.ts        # File storage abstraction
│   └── seed-data.mjs     # Demo data seeder
├── drizzle/
│   ├── schema.ts         # Database schema (source of truth)
│   └── triggers.sql      # Counter triggers (apply via db:triggers)
└── .env.example
```

## Database

Schema is managed with [Drizzle ORM](https://orm.drizzle.team) using `db push` (no migration files). Counter columns (`likeCount`, `commentCount`, `subscriberCount`) are maintained by PostgreSQL triggers for atomic, race-condition-free updates.

Key tables: `users`, `channels`, `videos`, `comments`, `likes`, `subscriptions`, `watchHistory`, `playlists`, `tags`, `notifications`, `reports`, `livestreams`, `liveChats`

## Live Streaming

WebRTC P2P streaming with polling-based signaling. Requires streamer and viewer to be on the same network (no TURN server configured). Past livestreams show metadata (date, duration, viewer count) but cannot be replayed — streams are not recorded.

## License

MIT
