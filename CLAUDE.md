# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARK: Survival Ascended Backup Manager - a monorepo web application for automated backup management of ARK dedicated servers. Built with TypeScript, React 18, Express, and Docker integration.

## Commands

```bash
# Install dependencies (pnpm auto-detected via packageManager field)
pnpm install

# Development
pnpm run dev:client          # Frontend at http://localhost:5173 (Vite HMR)
pnpm run dev:server          # Backend with nodemon auto-restart

# Build
pnpm run build               # Build both client and server
pnpm run build:client        # Build frontend only
pnpm run build:server        # Build backend only

# Formatting (Biome)
pnpm run format:all          # Format client and server
pnpm run format:client       # Format client only
pnpm run format:server       # Format server only
pnpm run lint:all            # Format check + TypeScript check

# Type checking
pnpm --filter ark-asa-backup-client exec tsc --noEmit
pnpm --filter ark-asa-backup-server exec tsc --noEmit

# Commits (Commitizen with conventional commits)
pnpm run commit

# Docker
docker compose up -d --build ark-asa-backup-web
```

## Architecture

### Monorepo Structure

```
ark-asa-backup-web/
├── client/              # React 18 frontend (ark-asa-backup-client)
├── server/              # Express backend (ark-asa-backup-server)
├── biome.json           # Shared formatter config
└── package.json         # Root workspace scripts
```

### Frontend Clean Architecture

The client follows strict Clean Architecture with domain-driven design:

```
client/src/
├── backups/             # Backups domain
│   ├── domain/          # Pure TypeScript interfaces (NO React)
│   ├── services/        # Pure business logic functions (NO side effects)
│   ├── adapters/        # API communication (fetch calls)
│   ├── repository/      # State management (React Query + SSE)
│   ├── useCases/        # Orchestration hooks (validation → API → state → feedback)
│   └── ui/              # React components (View layer)
├── server/              # Server control domain
├── system/              # System monitoring domain
└── shared/              # Cross-domain utilities
```

**Layer Rules:**
- Inner layers NEVER import from outer layers
- View → UseCase → Repository + Service + Adapter → Domain
- Services must be pure functions (same input = same output)
- Adapters hide external API details
- UseCases orchestrate the flow and provide user feedback

### Backend Modular Architecture

```
server/src/
├── server.ts            # Entry point
├── config/              # Constants and paths
├── types/               # TypeScript interfaces
├── services/            # Business logic (backup, docker, scheduler, settings, system)
├── routes/              # HTTP handlers (thin - delegate to services)
└── utils/               # SSE helpers
```

**Pattern:** Routes handle HTTP only, all business logic lives in services.

## Code Standards

### Formatting (Biome)
- Single quotes, semicolons required
- 100-character line width, 2-space indentation
- LF line endings
- Run `pnpm run format:all` before committing

### TypeScript
- Strict mode enabled
- NO `any` types (use `unknown` with type guards)
- All functions must have typed parameters and return values

### Variable Naming
**CRITICAL:** Descriptive names only - NO single-character variables

```typescript
// Good
const backupIntervalSeconds = 1800;
const httpRequest = req;
const backupIndex = 0;

// Bad
const x = 1800;
const i = 0;
const req = request;
```

### Documentation
Google-style JSDoc required for all functions:
- `@fileoverview` for files
- `@param`, `@returns`, `@throws`, `@async` as applicable

### React Conventions
- Functional components with hooks only
- Props must have TypeScript interfaces
- Use `async/await` consistently (no `.then()`)

### Commits
Use conventional commits via `pnpm run commit`:
- `feat(client):` / `feat(server):` for features
- `fix(client):` / `fix(server):` for bugs
- Scopes: `client`, `server`, `deps`, `dev-deps`, `release`

## Real-Time Updates

The app uses Server-Sent Events (SSE) for real-time updates:
- `/api/stream` - Unified stream (backups, status, health, diskspace, version)
- Repositories subscribe via `EventSource` and update React Query cache

## Key Technologies

- **Frontend:** React 18, Vite, Hero UI, Tailwind CSS 4, Framer Motion
- **Backend:** Express, Dockerode, tar
- **State:** Custom hooks with SSE integration (no Redux/Zustand)
- **Formatting:** Biome (migrated from Prettier)
