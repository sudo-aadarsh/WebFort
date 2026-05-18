# ── Stage 1: Build ─────────────────────────────────────────────
FROM node:22-alpine AS base

WORKDIR /app

# Copy dependency manifests
COPY package.json package-lock.json ./

# Install production deps only
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/
COPY .env.example ./.env

# ── Stage 2: API Server ───────────────────────────────────────
FROM base AS api
EXPOSE 3001
CMD ["node", "src/server.js"]

# ── Stage 3: Scan Worker ──────────────────────────────────────
FROM base AS worker
CMD ["node", "src/worker.js"]
