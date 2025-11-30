# Multi-stage Dockerfile for ARK ASA Backup Manager using pnpm workspaces

# ============================================================================
# Stage 1: Builder (frontend + backend)
# ============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Enable Corepack to provide pnpm
RUN corepack enable

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

# Install dependencies for all workspaces
RUN pnpm install --frozen-lockfile

# Copy the rest of the repository (honors .dockerignore)
COPY . .

# Build frontend and backend
RUN pnpm --filter client run build && pnpm --filter server run build

# ============================================================================
# Stage 2: Runtime image
# ============================================================================
FROM node:20-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# Copy manifests to install only server production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY server/package.json ./server/package.json

RUN pnpm install --filter server --prod --frozen-lockfile

# Copy built artifacts
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./static/dist

EXPOSE 8080
ENV NODE_ENV=production

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

WORKDIR /app/server
CMD ["node", "dist/server.js"]
