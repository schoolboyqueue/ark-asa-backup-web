# Multi-stage Dockerfile for ARK ASA Backup Manager using pnpm workspaces

# ============================================================================
# Stage 1: Builder (frontend + backend)
# ============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Enable Corepack to provide pnpm
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential python3 \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# Copy workspace manifests first for better layer caching
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

# Install dependencies for all workspaces (skip Husky hooks in container)
ENV HUSKY=0
RUN pnpm install --frozen-lockfile

# Copy the rest of the repository (honors .dockerignore)
COPY . .

# Build frontend and backend (filters reference package names)
RUN pnpm --filter ark-asa-backup-client run build \
    && pnpm --filter ark-asa-backup-server run build \
    && test -d client/dist && test -d server/dist

# ============================================================================
# Stage 2: Runtime image
# ============================================================================
FROM node:20-slim

WORKDIR /app

# Only install curl for healthcheck (not build-essential/python3)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && corepack enable

# Copy manifests to install only server production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY client/package.json ./client/package.json
COPY server/package.json ./server/package.json

ENV HUSKY=0 \
    NODE_ENV=production \
    DOCKER_ENV=true

# Install production dependencies only (no dev deps, no scripts)
RUN pnpm install --filter ark-asa-backup-server --prod --frozen-lockfile --ignore-scripts

# Copy built artifacts (server code + client bundle served by server)
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/client/dist ./server/static/dist

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Run as non-root user for security
USER node

WORKDIR /app/server
CMD ["node", "dist/server.js"]
