# ── Stage 1: Install dependencies ─────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app
RUN npm install -g pnpm@10.4.1
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile

# ── Stage 2: Build frontend (Vite) + backend (esbuild) ────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm install -g pnpm@10.4.1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build
# dist/public/ = React SPA static files
# dist/index.js = Express backend bundle

# ── Stage 3: Production runtime (slim image) ───────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Chỉ cài production dependencies (bỏ devDependencies)
RUN npm install -g pnpm@10.4.1
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/
RUN pnpm install --frozen-lockfile --prod

# Copy build output từ stage 2
COPY --from=builder /app/dist ./dist

# Tạo thư mục uploads cho local file storage fallback
RUN mkdir -p server/uploads

EXPOSE 3000

CMD ["node", "dist/index.js"]
