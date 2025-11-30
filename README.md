# ARK: Survival Ascended Backup Manager

A modern, full-featured web application for automated backup management of ARK: Survival Ascended dedicated servers. Built with TypeScript, React, and Node.js with a focus on reliability, real-time monitoring, and clean architecture.

[![Built with Claude Code](https://img.shields.io/badge/Built%20with-Claude%20Code-5C5CFF)](https://claude.com/claude-code)

## Features

### Core Backup Functionality
- **Automated Backups**: Configurable interval-based backup scheduling (30 seconds to 24 hours)
- **Manual Backups**: Trigger on-demand backups with optional notes and tags
- **Smart Retention**: Automatic pruning to maintain configured backup count
- **Backup Metadata**: Add descriptive notes and tags to backups for easy organization
- **ARK Save Info Extraction**: Automatic game metadata from backup archives
  - Map name detection (all official ARK ASA maps)
  - Player count from .arkprofile files
  - Tribe count from .arktribe files
  - Auto-save count detection
  - Auto-suggested tags based on save data
- **Tag-Based Search**: Filter backups by tags, notes, or name
- **Safe Restore**: Enforces server shutdown before restore to prevent corruption
- **Optional Safety Backups**: Auto-create pre-restore snapshots for rollback capability
- **Backup Verification**: Validate backup archives for integrity

### Real-Time Monitoring
- **Server-Sent Events (SSE)**: Real-time updates without polling
  - ARK server status changes
  - Backup list updates
  - Backup scheduler health
  - Disk space usage
  - Version information
- **System Health Dashboard**: Aggregate health monitoring with color-coded indicators
  - Server status (running/stopped)
  - Backup scheduler activity
  - Storage usage warnings (75% yellow, 90% red)
  - Last backup timestamp
  - Error tracking
  - Client and server version display

### Modern Web Interface
- **Responsive Design**: Optimized for mobile (iPhone), tablet (iPad), and desktop
  - Mobile: Card-based layout with vertical stacking
  - Tablet/Desktop: Table view with horizontal controls
  - Adaptive padding and typography
- **Dark/Light/System Theme**: User preference with localStorage persistence
- **Toast Notifications**: User-friendly feedback for all actions
- **Pagination**: Efficient browsing of large backup archives
- **Search & Filter**: Quick backup discovery with date range filtering
- **Progress Tracking**: Real-time restore progress with SSE
- **Backup Details Drawer**: Comprehensive backup information and metadata management

### Server Management
- **ARK Server Control**: Start/stop ARK container via Docker API
- **Container Integration**: Monitors and controls ARK server container
- **Health Checks**: Continuous monitoring of server and scheduler status

## Documentation

This project uses a tiered documentation structure:

- **[client/README.md](client/README.md)** - Frontend implementation details
  - Clean Architecture principles and patterns
  - Domain structure (backups, server, system, shared)
  - React components and hooks
  - Development setup and code standards

- **[server/README.md](server/README.md)** - Backend implementation details
  - Modular service architecture
  - API endpoints and SSE streams
  - Docker integration
  - Development setup and code standards

- **[CHANGELOG.md](CHANGELOG.md)** - Version history
  - Follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format
  - Semantic versioning

- **[CLAUDE.md](CLAUDE.md)** - Development guidelines for AI assistants
  - Architecture patterns and principles
  - Code standards and conventions

## Technology Stack

### Backend
- **Runtime**: Node.js 20 (Slim)
- **Framework**: Express.js with TypeScript
- **Docker Integration**: Dockerode for container management
- **Real-time**: Server-Sent Events (SSE) for live updates
- **Architecture**: Modular service layer with Express Router pattern
  - Refactored from 1,564-line monolith to 12 focused modules (93% reduction)
  - Clean separation: routes → services → data
  - Single-threaded event loop with background scheduler

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite (fast HMR during development)
- **UI Library**: Hero UI (NextUI fork) with Tailwind CSS
- **Icons**: Heroicons (24px solid)
- **Date/Time**: Day.js with relativeTime plugin
- **Architecture**: Clean Architecture with domain-driven design
  - Feature-first organization (backups, server, system domains)
  - Strict layer separation (Domain → Service → Adapter → Repository → UseCase → View)
  - Business logic in pure, testable functions
  - Framework-agnostic domain layer

### DevOps
- **Container**: Multi-stage Docker build (builder → production)
- **Volume Mounts**:
  - `/backups` - Backup archive storage
  - `/save` - Live SavedArks directory (read-only)
  - `/config` - Settings configuration
  - `/var/run/docker.sock` - Docker API access

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- ARK: Survival Ascended server running in a Docker container
- Access to Docker socket (`/var/run/docker.sock`)

### Docker Compose Setup

```yaml
services:
  ark-asa:
    # Your ARK server configuration
    container_name: ark-asa
    # ... other ARK server settings

  ark-asa-backup-web:
    container_name: ark-asa-backup-web
    build: ./ark-asa-backup-web/web
    ports:
      - "8091:8080"
    volumes:
      - ./backups:/backups
      - ./config:/config
      - /path/to/ark/SavedArks:/save:ro
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - ARK_BACKUP_CONTAINER_NAME=ark-asa
    depends_on:
      - ark-asa
    restart: unless-stopped
```

### Configuration

Create `config/settings.env`:

```bash
# Backup interval in seconds (60-86400)
BACKUP_INTERVAL=1800

# Maximum backups to retain (1-100)
MAX_BACKUPS=3

# Auto-create pre-restore safety backup
AUTO_SAFETY_BACKUP=true
```

### Start the Stack

```bash
docker compose up -d --build ark-asa-backup-web
```

Access the web interface at `http://localhost:8091`

## Architecture

### High-Level Overview

**Frontend (React + TypeScript)**:
- Clean Architecture with domain-driven design
- Three domains: backups, server, system
- Strict layer separation: Domain → Service → Adapter → Repository → UseCase → View
- Real-time updates via Server-Sent Events (SSE)
- See [client/README.md](client/README.md) for detailed architecture

**Backend (Node.js + Express)**:
- Modular service-oriented architecture
- Routes → Services → Data layers
- Background scheduler for automated backups
- Docker integration for server control
- See [server/README.md](server/README.md) for detailed architecture

### Key Design Patterns
- **Singleton**: Docker client for centralized container management
- **Repository**: State management and data access abstraction
- **Observer**: SSE broadcast system for real-time updates
- **Facade**: Simplified Docker API interactions
- **Strategy**: Theme selection (light/dark/system)
- **Service Layer**: Business logic separated from HTTP handling

## API Endpoints

### Backups
- `GET /api/backups` - List all backups with metadata
- `GET /api/backups/stream` - SSE stream for backup list updates
- `POST /api/backups/trigger` - Create manual backup with optional notes and tags
- `PUT /api/backups/notes` - Update backup notes and tags
- `POST /api/delete` - Delete backup
- `GET /api/download/:name` - Download backup archive
- `POST /api/restore` - Restore backup (SSE progress stream)
- `POST /api/verify` - Verify backup archive integrity

### Settings
- `GET /api/settings` - Get backup configuration
- `POST /api/settings` - Update backup configuration

### Server Control
- `GET /api/server/status` - Get ARK server status
- `GET /api/server/status/stream` - SSE stream for status updates
- `POST /api/server/start` - Start ARK server
- `POST /api/server/stop` - Stop ARK server

### System Monitoring
- `GET /api/disk-space` - Get storage usage
- `GET /api/disk-space/stream` - SSE stream for storage updates
- `GET /api/backup/health` - Get backup system health
- `GET /api/backup/health/stream` - SSE stream for health updates

## Development

### Local Development

```bash
# Install dependencies (Corepack auto-detects pnpm from packageManager)
pnpm install

# Run frontend dev server (HMR enabled)
pnpm run dev:client

# Run backend dev server (nodemon auto-restart)
pnpm run dev:server

# Production build (client + server)
pnpm run build

# Start production server
pnpm --filter server run start
```

### Code Standards

This project follows strict TypeScript and Clean Architecture standards:

- **Formatting**: Prettier with single quotes, 100-char line width, semicolons
- **Type Safety**: Strict TypeScript, no `any` types
- **Documentation**: Google-style JSDoc for all code
- **Testing**: Service layer unit tests + user journey integration tests
- **Variable Naming**: Descriptive names only - NO single-character variables

For detailed code standards and patterns:
- Frontend: See [client/README.md](client/README.md) - Clean Architecture layer rules
- Backend: See [server/README.md](server/README.md) - Modular service patterns

### Build & Deploy

```bash
# Rebuild container with latest code
docker compose up -d --build ark-asa-backup-web

# View logs
docker compose logs -f ark-asa-backup-web

# Check health
curl http://localhost:8091/health
```

## Backup Metadata

Backups are stored as `.tar.gz` archives with optional `.meta.json` files:

```json
{
  "name": "saves-2024-01-15_120000.tar.gz",
  "created_at": 1705320000,
  "notes": "Before boss fight - all dinos at base",
  "tags": ["pre-boss", "all-dinos", "manual"]
}
```

### Standard Tags
- `pre-boss` - Before boss encounters
- `milestone` - Significant progress points
- `pre-update` - Before game updates
- `stable` - Known stable states
- `experimental` - Testing new features
- `manual` - Manually triggered backups

## Responsive Breakpoints

- **Mobile** (`< 640px`): Card-based layout, vertical stacking, icon-only buttons
- **Tablet** (`≥ 640px`, `sm:` prefix): Mixed layout with optimized spacing
- **Desktop** (`≥ 768px`, `md:` prefix): Full table view, horizontal controls

## Performance Optimizations

- **SSE vs Polling**: Eliminated periodic HTTP polling, reduces network traffic
- **Multi-stage Docker Build**: Smaller production images (no dev dependencies)
- **Code Splitting**: Vite dynamic imports for lazy loading
- **Caching**: Static assets served with efficient cache headers
- **Custom Hooks**: State management with 67% reduction in useState calls
- **Memoization**: useMemo and useCallback for performance optimization

## Security Considerations

- **Read-only Mounts**: ARK save directory mounted read-only
- **Docker Socket Access**: Required for container control (use with caution)
- **Input Validation**: All user inputs validated on backend
- **Error Handling**: Comprehensive try/catch with safe error messages
- **No Authentication**: Designed for LAN-only deployment (add reverse proxy with auth for internet exposure)

## Troubleshooting

### Container Name Mismatch
If your ARK container isn't named `ark-asa`, set the environment variable:
```yaml
environment:
  - ARK_BACKUP_CONTAINER_NAME=your-container-name
```

### Permission Issues
Ensure backup directory is writable:
```bash
chmod -R 777 backups
```

### SSE Connection Errors
Check browser console for EventSource errors. SSE requires HTTP/1.1 or HTTP/2.

### Backup Scheduler Not Running
Check logs for scheduler errors:
```bash
docker compose logs ark-asa-backup-web | grep scheduler
```

### White Screen / Blank Page
Check browser console for JavaScript errors. Common causes:
- Variable initialization order (hooks called before state declared)
- Old variable references not updated to use hook properties
- Missing dependencies in package.json

## Conventional Commits & Automated Releases

### Commit Process
- Use `pnpm run commit` to launch Commitizen with the `@commitlint/cz-commitlint` adapter.
- Scopes auto-complete from the project workspaces (`client`, `server`) and custom scopes (`deps`, `dev-deps`, `release`).
- Husky hooks run Prettier via `lint-staged` before every commit and `commitlint` afterwards, preventing invalid messages from landing in the repo.

### Release Workflow
- Versioning and changelog generation are driven by [simple-release](https://github.com/TrigenSoftware/simple-release) via `.simple-release.json`.
- The GitHub workflow at `.github/workflows/release.yml` runs on pushes to `main` and on release issue comments, orchestrating `check`, `pull-request`, and `release` jobs.
- Provide `NPM_TOKEN` (publish access) and rely on the built-in `GITHUB_TOKEN` to allow the workflow to publish packages and release notes automatically.
- When the workflow detects release-worthy commits, it raises a PR with version/changelog updates; merging that PR triggers the publish job.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Code Style**: Run `pnpm run format:all` before committing
2. **Documentation**:
   - Add Google-style JSDoc for all new code
   - Update relevant README files (project/server/client)
   - Update CHANGELOG.md for notable changes
3. **Architecture**: Follow Clean Architecture principles (see [client/README.md](client/README.md))
4. **Testing**: Manually test all changes (no automated tests yet)
5. **Commits**: Run `pnpm run commit` to create Conventional Commits (`feat(scope):`, `fix(scope):`, `chore(scope):`, `docs:` etc.); the Commitizen prompt plus commitlint hook keep history clean.

For detailed development guidelines:
- Frontend development: [client/README.md](client/README.md)
- Backend development: [server/README.md](server/README.md)
- AI assistant guidelines: [CLAUDE.md](CLAUDE.md)

## License

MIT License - See [LICENSE](LICENSE) file for details

## Credits

Built with [Claude Code](https://claude.com/claude-code) by Anthropic.

## Support

For issues, questions, or feature requests, please open an issue on GitHub.
