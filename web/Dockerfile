# Multi-stage Dockerfile for ARK ASA Backup Manager
# Builds React frontend and Node.js backend, then creates minimal production image.
# Follows Docker best practices with proper layer caching and artifact cleanup.

# ============================================================================
# Stage 1: Build Stage
# ============================================================================
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files for dependency installation
COPY package.json package-lock.json* ./

# Install ALL dependencies (including devDependencies for build)
RUN npm ci && npm cache clean --force

# Copy configuration files
COPY tsconfig.json tsconfig.server.json tsconfig.node.json vite.config.ts ./
COPY .prettierrc .prettierignore ./

# Copy source code for both frontend and backend
COPY client ./client
COPY src ./src

# Build both frontend and backend
RUN npm run build

# ============================================================================
# Stage 2: Production Stage
# ============================================================================
FROM node:20-slim

# Install runtime dependencies only (curl for healthcheck)
RUN apt-get update \
    && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install ONLY production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built artifacts from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/static/dist ./static/dist

# Expose HTTP server port
EXPOSE 8080

# Set production environment
ENV NODE_ENV=production

# Health check configuration
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start the Node.js server
CMD ["node", "dist/server.js"]
