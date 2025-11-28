# Multi-stage Dockerfile for ARK ASA Backup Manager
# Builds React frontend and Node.js backend separately, then combines in production image.
# Follows Docker best practices with proper layer caching and artifact cleanup.

# ============================================================================
# Stage 1: Frontend Build
# ============================================================================
FROM node:20-slim AS frontend-builder

WORKDIR /app/client

# Copy client package files for dependency installation
COPY client/package.json client/package-lock.json* ./

# Install frontend dependencies
RUN npm ci && npm cache clean --force

# Copy client configuration files
COPY client/tsconfig.json client/tsconfig.node.json client/vite.config.ts client/tailwind.config.js ./

# Copy client source code
COPY client/src ./src
COPY client/index.html ./

# Build frontend
RUN npm run build

# ============================================================================
# Stage 2: Backend Build
# ============================================================================
FROM node:20-slim AS backend-builder

WORKDIR /app/server

# Copy server package files for dependency installation
COPY server/package.json server/package-lock.json* ./

# Install backend dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy server configuration files
COPY server/tsconfig.json ./

# Copy server source code
COPY server/src ./src

# Build backend
RUN npm run build

# ============================================================================
# Stage 3: Production Stage
# ============================================================================
FROM node:20-slim

# Install runtime dependencies only (curl for healthcheck)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy server package files
COPY server/package.json server/package-lock.json* ./

# Install ONLY production dependencies for server
RUN npm ci --only=production && npm cache clean --force

# Copy built backend from backend-builder
COPY --from=backend-builder /app/server/dist ./dist

# Copy built frontend from frontend-builder
COPY --from=frontend-builder /app/client/dist ./static/dist

# Expose HTTP server port
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the Node.js server
CMD ["node", "dist/server.js"]
