# ARK ASA Backup Manager - Backend

Node.js/Express backend for ARK: Survival Ascended backup management with modular architecture.

## Architecture

### Modular Design

Refactored from a 1,564-line monolith to a clean modular architecture with **93% reduction** in file size.

```
server/src/
├── server.ts                  # Entry point (116 lines)
├── config/
│   └── constants.ts           # Configuration and paths
├── types/
│   └── index.ts              # TypeScript interfaces
├── services/                  # Business logic layer
│   ├── backupService.ts       # Backup CRUD operations
│   ├── settingsService.ts     # Settings management
│   ├── dockerService.ts       # Docker container control
│   ├── systemService.ts       # System monitoring
│   └── schedulerService.ts    # Background scheduler
├── routes/                    # HTTP endpoint handlers
│   ├── healthRoutes.ts        # Health checks
│   ├── settingsRoutes.ts      # Settings API
│   ├── backupRoutes.ts        # Backup CRUD
│   ├── serverRoutes.ts        # Server control
│   └── sseRoutes.ts           # SSE streams
└── utils/
    └── sseStream.ts           # SSE helpers
```

### Layer Responsibilities

**Routes Layer** - HTTP request/response handling ONLY
- Validate inputs
- Delegate to services
- Return responses
- NO business logic

**Services Layer** - Business logic and data operations
- Pure, testable functions where possible
- Reusable across multiple routes
- All business rules and validations

**Utilities Layer** - Shared helper functions
- No business logic
- Reusable utilities (e.g., SSE stream setup)

**Config Layer** - Application constants
- Environment variables
- Path configuration
- Centralized defaults

**Types Layer** - TypeScript interfaces
- Shared type definitions
- API request/response types

### Design Patterns

- **Singleton**: Docker client for centralized container management
- **Repository**: File system abstraction in backup service
- **Observer**: SSE broadcast system for real-time updates
- **Facade**: Simplified Docker API in docker service
- **Service Layer**: Business logic separated from HTTP handling

## API Endpoints

### Backups

```
GET    /api/backups              - List all backups with metadata
GET    /api/backups/stream       - SSE: Backup list updates
POST   /api/backups/trigger      - Create manual backup
PUT    /api/backups/notes        - Update backup metadata
POST   /api/delete               - Delete backup
GET    /api/download/:name       - Download backup archive
POST   /api/restore              - Restore backup (SSE progress)
POST   /api/backups/:name/verify - Verify backup integrity
```

### Settings

```
GET    /api/settings             - Get backup configuration
POST   /api/settings             - Update backup configuration
```

### Server Control

```
GET    /api/server/status        - Get ARK server status
GET    /api/server/status/stream - SSE: Server status updates
POST   /api/server/start         - Start ARK server
POST   /api/server/stop          - Stop ARK server
```

### System Monitoring

```
GET    /api/disk-space           - Get storage usage
GET    /api/disk-space/stream    - SSE: Storage updates
GET    /api/backup/health        - Get scheduler health
GET    /api/backup/health/stream - SSE: Health updates
GET    /health                   - Service health check
```

## Development

### Prerequisites

- Node.js 20+
- Docker socket access (`/var/run/docker.sock`)
- Write access to `/backups`, `/config` directories

### Setup

```bash
cd server

# Install dependencies
npm install

# Development (nodemon auto-restart)
npm run dev

# Production build
npm run build

# Start production server
npm start
```

### Environment Variables

```bash
# ARK server container name (default: ark-asa)
ARK_BACKUP_CONTAINER_NAME=ark-asa

# HTTP server port (default: 8080)
PORT=8080

# File ownership (default: 1000)
PUID=1000
PGID=1000
```

### Configuration File

Located at `/config/settings.env`:

```bash
# Backup interval in seconds (60-86400)
BACKUP_INTERVAL=1800

# Maximum backups to retain (1-100)
MAX_BACKUPS=3

# Auto-create pre-restore safety backup
AUTO_SAFETY_BACKUP=true
```

## Code Standards

### Module Pattern

When creating new functionality:

1. **Create service function** in appropriate service file
2. **Create route handler** that calls service
3. **NO business logic in routes**
4. **Export service functions** for reuse
5. **Document with JSDoc**

Example:

```typescript
// services/myService.ts
/**
 * Business logic function description.
 * @param {string} input - Description
 * @returns {Promise<Result>}
 * @async
 */
export async function performOperation(input: string): Promise<Result> {
  // Business logic here
}

// routes/myRoutes.ts
import { Router } from 'express';
import { performOperation } from '../services/myService';

const router = Router();

router.get('/api/endpoint', async (req, res) => {
  try {
    const result = await performOperation(req.params.input);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'User-friendly message' });
  }
});

export default router;
```

### TypeScript Conventions

- **Strict mode enabled** - All types required
- **No `any` types** - Use proper interfaces
- **Google-style JSDoc** - All functions documented
- **Variable naming** - Descriptive names only (no `x`, `i`, `res`, `req`, `e`)
- **Constants** - Extract magic numbers/strings
- **Error handling** - Comprehensive try/catch
- **Path handling** - Use `path` module for cross-platform compatibility

### Formatting

```bash
# Format code (Prettier)
npm run format

# Check formatting
npm run format:check
```

**Prettier Configuration:**
- Single quotes
- Semicolons required
- 100-character line width
- 2-space indentation
- LF line endings

## Docker Integration

### Singleton Docker Client

The Docker client uses singleton pattern in `dockerService.ts`:

```typescript
import Docker from 'dockerode';

// Singleton instance
const docker = new Docker({ socketPath: '/var/run/docker.sock' });
```

### Container Control

**Start Server:**
- No force parameter
- Wait for graceful start
- Return updated status

**Stop Server:**
- 60-second timeout
- Force kill if timeout exceeded
- Return updated status

**Status Check:**
- Inspect container state
- Return running/stopped/exited

## Real-Time Updates (SSE)

### SSE Stream Setup

Use the helper function from `utils/sseStream.ts`:

```typescript
import { setupSSEStream } from '../utils/sseStream';

router.get('/api/stream', (req, res) => {
  setupSSEStream(req, res);

  // Send initial data
  res.write(`event: connected\n`);
  res.write(`data: ${JSON.stringify({ status: 'ok' })}\n\n`);

  // Set up periodic updates
  const interval = setInterval(() => {
    res.write(`event: update\n`);
    res.write(`data: ${JSON.stringify({ time: Date.now() })}\n\n`);
  }, 1000);

  // Cleanup on disconnect
  req.on('close', () => {
    clearInterval(interval);
  });
});
```

### SSE Event Types

- `connected` - Initial connection established
- `backups` - Backup list updated
- `status` - Server status changed
- `health` - Scheduler health updated
- `diskspace` - Storage usage updated
- `error` - Error occurred

## File Operations

### Backup Archive Format

- **Format**: `.tar.gz` files
- **Naming**: `saves-YYYY-MM-DD_HHMMSS.tar.gz`
- **Location**: `/backups` directory

### Metadata Files

- **Format**: `.meta.json` files
- **Naming**: Same base name as archive
- **Schema**:

```json
{
  "name": "saves-2024-01-15_120000.tar.gz",
  "created_at": 1705320000,
  "notes": "Optional user notes",
  "tags": ["optional", "tags"],
  "verification_status": "verified",
  "verified_file_count": 42,
  "verification_time": 1705320100
}
```

### Path Configuration

All paths configured in `config/constants.ts`:

```typescript
export const PATHS = {
  BACKUPS_DIR: '/backups',
  SAVES_DIR: '/save',
  CONFIG_DIR: '/config',
  SETTINGS_FILE: '/config/settings.env',
};
```

## Background Scheduler

Located in `services/schedulerService.ts`:

- **Interval**: Configurable (60-86400 seconds)
- **Startup**: Auto-starts on server launch
- **Health Tracking**: Last backup time, errors tracked
- **Graceful Shutdown**: Stops on process exit

### Scheduler Health

```typescript
interface BackupHealthStatus {
  scheduler_active: boolean;
  last_successful_backup: number | null;
  last_error: string | null;
}
```

## Security

- **Read-only mounts**: SavedArks directory is read-only
- **Input validation**: All user inputs validated
- **Error sanitization**: No sensitive info in error messages
- **Docker socket**: Required but use with caution
- **No authentication**: LAN deployment only (add reverse proxy for internet)

## Troubleshooting

### Container Name Issues

If ARK container isn't `ark-asa`:

```bash
docker inspect <container-name>  # Get actual name
```

Set environment variable:

```yaml
environment:
  - ARK_BACKUP_CONTAINER_NAME=actual-container-name
```

### Permission Issues

Ensure directories are writable:

```bash
chmod -R 777 /backups
chmod -R 777 /config
```

### Scheduler Not Running

Check logs:

```bash
docker logs ark-asa-backup-web | grep scheduler
```

### Docker Socket Access

Verify socket is accessible:

```bash
ls -la /var/run/docker.sock
docker ps  # Should work from inside container
```

## Performance

- **Single-threaded**: Node.js event loop
- **Non-blocking I/O**: Async/await throughout
- **SSE**: Eliminates polling overhead
- **File streaming**: Large backups streamed, not buffered
- **Graceful shutdown**: Completes in-flight operations

## Testing

Manual testing recommended:

1. Test all API endpoints with Postman/curl
2. Verify SSE connections stay alive
3. Test backup/restore flows end-to-end
4. Verify scheduler operates correctly
5. Test Docker container control
6. Check error handling paths

## Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### Backend-Specific Guidelines

- Keep routes thin - delegate to services
- Services should be pure and testable
- Document all functions with JSDoc
- Use TypeScript strictly (no `any`)
- Follow existing patterns (Singleton, Repository, etc.)
- Run formatter before committing
