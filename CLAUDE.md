# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ARK: Survival Ascended Backup Manager - A modern web application for automated backup management of ARK: Survival Ascended dedicated servers. Built with TypeScript, React, Express, and Docker with real-time monitoring via Server-Sent Events (SSE).

## Development Commands

### Common Operations

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Development (runs both frontend and backend)
npm run dev

# Development - Frontend only (Vite HMR on port 5173)
npm run dev:client

# Development - Backend only (nodemon auto-restart)
npm run dev:server

# Production build (builds both client and server)
npm run build

# Production build - Frontend only
npm run build:frontend

# Production build - Backend only
npm run build:server

# Start production server (requires build first)
npm start

# Code formatting
npm run format

# Check formatting without changes
npm run format:check
```

### Docker Operations

```bash
# Rebuild and start container
docker compose up -d --build ark-asa-backup-web

# View logs
docker compose logs -f ark-asa-backup-web

# Stop container
docker compose stop ark-asa-backup-web

# Check health endpoint
curl http://localhost:8091/health
```

## Architecture

### Modular Backend Design

The backend was refactored from a 1,564-line monolith to a modular architecture with 93% reduction in file size. The architecture follows strict separation of concerns:

**Routes Layer** (`src/routes/`) - HTTP endpoint handlers ONLY
- No business logic, only request/response handling
- Validate inputs and delegate to services
- Express Router pattern for all routes
- Files: `healthRoutes.ts`, `settingsRoutes.ts`, `backupRoutes.ts`, `serverRoutes.ts`, `sseRoutes.ts`

**Services Layer** (`src/services/`) - Business logic and data operations
- Pure, testable functions where possible
- Reusable across multiple routes
- Handle all business rules and validations
- Files: `backupService.ts`, `settingsService.ts`, `dockerService.ts`, `systemService.ts`, `schedulerService.ts`

**Utilities Layer** (`src/utils/`) - Shared helper functions
- Reusable utilities with no business logic
- Example: SSE stream setup helpers

**Config Layer** (`src/config/`) - Application constants
- Centralized configuration values
- Environment variables and defaults
- Path configuration

**Types Layer** (`src/types/`) - TypeScript interfaces
- Centralized type definitions shared across backend

### Frontend Architecture

**Component Structure** (`client/src/components/`)
- `App.tsx` - Main application with theme management
- `HeaderControls.tsx` - System status + server controls (composition pattern)
- `SystemStatus.tsx` - Health monitoring dashboard
- `ServerControls.tsx` - Server start/stop + settings
- `BackupsList.tsx` - Backup table/cards with actions
- `BackupDetailsDrawer.tsx` - Backup details and metadata management

**Custom Hooks Pattern** (`client/src/hooks/`)
State management extracted into custom hooks for reusability and separation of concerns:
- `useBackupSort.ts` - Sorting logic
- `useBackupFilters.ts` - Search and date filtering
- `useBackupPagination.ts` - Pagination with auto-reset
- `useRestoreProgress.ts` - SSE restore progress tracking
- `useBackupActions.ts` - CRUD operations with loading states
- `useBackupMetadata.ts` - Metadata save operations

Custom hooks reduced useState calls by 67% and improved code organization.

**Services** (`client/src/services/`)
- `api.ts` - HTTP client with SSE connection methods
- `toast.ts` - Toast notification service

## Clean Architecture Principles (Nik Sumeiko Style)

### CRITICAL: Architecture Philosophy

When building new features or refactoring existing code, follow **Clean Architecture** principles with strict functional layer separation. This ensures:
- Business logic is testable and framework-agnostic
- Components are reusable and easy to change
- Clear boundaries between concerns
- Code organized by feature/domain, not by technical type

### Functional Layers (Strict Responsibilities)

#### 1. VIEW LAYER (React Components)

**Location:** `client/src/<feature>/ui/` or `client/src/components/`

**Responsibilities:**
- Render JSX/HTML ONLY
- Receive view model and callbacks from UseCase hook
- Wire DOM events to callbacks (onClick, onSubmit, etc.)
- Simple presentation logic only (show/hide, formatting)

**Forbidden:**
- ❌ NO fetch/axios calls or API logic
- ❌ NO direct SDK usage
- ❌ NO business rules or domain decisions
- ❌ NO complex data transformations
- ❌ NO side effects

**Example:**
```typescript
// client/src/backups/ui/BackupForm.tsx
interface BackupFormProps {
  // Props are simple and declarative
}

export function BackupForm() {
  // Get view model and actions from UseCase
  const { formState, isLoading, error, actions } = useCreateBackup();

  return (
    <form onSubmit={actions.handleSubmit}>
      {/* Just render - no logic */}
      <Input value={formState.notes} onChange={actions.setNotes} />
      <Button isLoading={isLoading}>Create Backup</Button>
      {error && <Alert>{error}</Alert>}
    </form>
  );
}
```

#### 2. USECASE LAYER (Orchestration Hooks)

**Location:** `client/src/<feature>/useCases/`

**Responsibilities:**
- Orchestrate interaction between View, Repository, Service, and Adapter
- Call Repository hooks to read/update app state
- Call Service functions to apply business rules
- Call Adapter functions to trigger side-effects
- Aggregate outputs into view model for View
- Handle loading states, errors, and user feedback

**Pattern:**
```typescript
// client/src/backups/useCases/useCreateBackup.ts
import { useBackupsRepository } from '../repository/useBackupsRepository';
import { validateBackupNotes } from '../services/backupValidationService';
import { backupApiAdapter } from '../adapters/backupApiAdapter';

export function useCreateBackup() {
  const { backups, addBackup, invalidateBackups } = useBackupsRepository();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formState, setFormState] = useState({ notes: '', tags: [] });

  const handleSubmit = async () => {
    setIsLoading(true);
    setError(null);

    // 1. Validate using Service
    const validation = validateBackupNotes(formState.notes);
    if (!validation.isValid) {
      setError(validation.error);
      setIsLoading(false);
      return;
    }

    try {
      // 2. Trigger side-effect via Adapter
      const result = await backupApiAdapter.createBackup(formState);

      // 3. Update app state via Repository
      addBackup(result);

      // 4. User feedback
      toast.success('Backup created successfully');
      setFormState({ notes: '', tags: [] });
    } catch (err) {
      setError('Failed to create backup');
    } finally {
      setIsLoading(false);
    }
  };

  // Return view model
  return {
    formState,
    isLoading,
    error,
    actions: {
      handleSubmit,
      setNotes: (notes: string) => setFormState(s => ({ ...s, notes })),
      setTags: (tags: string[]) => setFormState(s => ({ ...s, tags })),
    },
  };
}
```

#### 3. REPOSITORY LAYER (State Management Hooks)

**Location:** `client/src/<feature>/repository/`

**Responsibilities:**
- Encapsulate "where data lives" and "how we access it"
- Manage local/remote state (React Query, Zustand, Redux, useState, etc.)
- Provide stable, intention-revealing APIs in domain language
- Handle caching, invalidation, optimistic updates
- Expose data and operations (e.g., `backups`, `loadBackups`, `updateBackup`)

**Forbidden:**
- ❌ NO business rules (that's Service layer)
- ❌ NO rendering logic

**Example:**
```typescript
// client/src/backups/repository/useBackupsRepository.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { backupApiAdapter } from '../adapters/backupApiAdapter';

export function useBackupsRepository() {
  const queryClient = useQueryClient();

  // Query for reading data
  const { data: backups = [], isLoading, error } = useQuery({
    queryKey: ['backups'],
    queryFn: () => backupApiAdapter.getBackups(),
  });

  // Mutation for creating backups
  const createMutation = useMutation({
    mutationFn: backupApiAdapter.createBackup,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['backups'] });
    },
  });

  return {
    // Data in domain language
    backups,
    isLoading,
    error,

    // Operations in domain language
    createBackup: createMutation.mutate,
    invalidateBackups: () => queryClient.invalidateQueries({ queryKey: ['backups'] }),
  };
}
```

#### 4. SERVICE LAYER (Pure Business Logic)

**Location:** `client/src/<feature>/services/` or `src/<feature>/domain/`

**Responsibilities:**
- Implement domain logic and rules
- Validation rules and invariants
- Calculations and transformations
- Decision logic (what is allowed, error conditions)
- Pure, deterministic functions

**Forbidden:**
- ❌ NO React imports
- ❌ NO browser APIs (fetch, localStorage, window)
- ❌ NO SDKs or IO operations
- ❌ NO framework dependencies

**Example:**
```typescript
// client/src/backups/services/backupValidationService.ts

/**
 * Domain rules for backup notes validation.
 * Pure function - same input always produces same output.
 */
export function validateBackupNotes(notes: string): { isValid: boolean; error?: string } {
  if (!notes || notes.trim().length === 0) {
    return { isValid: false, error: 'Notes cannot be empty' };
  }

  if (notes.length > 500) {
    return { isValid: false, error: 'Notes must be 500 characters or less' };
  }

  return { isValid: true };
}

/**
 * Calculate backup retention priority based on tags and age.
 * Pure business logic - no side effects.
 */
export function calculateBackupPriority(backup: Backup): number {
  const hasImportantTag = backup.tags.some(tag =>
    ['pre-boss', 'milestone', 'stable'].includes(tag)
  );

  const ageInDays = (Date.now() - backup.created_at * 1000) / (1000 * 60 * 60 * 24);

  if (hasImportantTag) return 100;
  if (ageInDays < 7) return 50;
  return 10;
}

// Easy to unit test!
describe('validateBackupNotes', () => {
  it('rejects empty notes', () => {
    expect(validateBackupNotes('').isValid).toBe(false);
  });

  it('accepts valid notes', () => {
    expect(validateBackupNotes('Valid backup notes').isValid).toBe(true);
  });
});
```

#### 5. ADAPTER LAYER (Side Effects & IO)

**Location:** `client/src/<feature>/adapters/` or `client/src/services/`

**Responsibilities:**
- Talk to external systems (HTTP, GraphQL, SDKs)
- Implement "ports" that UseCases consume
- Hide library/framework details from domain
- Transform external data to/from domain models
- Handle low-level errors and retries

**Forbidden:**
- ❌ NO React hooks
- ❌ NO business rules

**Example:**
```typescript
// client/src/backups/adapters/backupApiAdapter.ts
import { api } from '../../services/api'; // HTTP client
import type { Backup, CreateBackupDto } from '../domain/backup';

/**
 * Adapter for backup API operations.
 * Hides HTTP implementation details from the rest of the app.
 */
export const backupApiAdapter = {
  /**
   * Fetch all backups from the server.
   */
  async getBackups(): Promise<Backup[]> {
    const response = await api.get<Backup[]>('/api/backups');
    return response.data;
  },

  /**
   * Create a new backup with notes and tags.
   */
  async createBackup(dto: CreateBackupDto): Promise<Backup> {
    const response = await api.post<Backup>('/api/backups/trigger', {
      notes: dto.notes,
      tags: dto.tags,
    });
    return response.data;
  },

  /**
   * Delete a backup by name.
   */
  async deleteBackup(backupName: string): Promise<void> {
    await api.post('/api/delete', { name: backupName });
  },
};
```

### Dependency Direction Rules

**STRICT RULE:** Inner layers NEVER import from outer layers.

```
View → UseCase → Repository + Service + Adapter
                       ↓
                   Domain Models
```

- ✅ View can import UseCase
- ✅ UseCase can import Repository, Service, Adapter
- ✅ Repository can import Adapter
- ❌ Service CANNOT import React, Repository, or Adapter
- ❌ Adapter CANNOT import React or Repository
- ❌ Repository CANNOT import Service

### Recommended Project Structure

Organize by **feature/domain first**, then by layer:

```
client/src/
  backups/                    # Feature/domain folder
    domain/
      backup.ts               # Domain models and types
      backupRules.ts          # Business rules
    services/
      backupValidationService.ts
      backupPriorityService.ts
    adapters/
      backupApiAdapter.ts     # HTTP API calls
    repository/
      useBackupsRepository.ts # State management
    useCases/
      useCreateBackup.ts      # Orchestration
      useListBackups.ts
      useRestoreBackup.ts
    ui/
      BackupsPage.tsx         # View components
      BackupForm.tsx
      BackupCard.tsx

  server/                     # Server control feature
    domain/
      serverStatus.ts
    services/
      serverControlService.ts
    adapters/
      serverApiAdapter.ts
    repository/
      useServerRepository.ts
    useCases/
      useServerControl.ts
    ui/
      ServerControls.tsx

  shared/                     # Cross-cutting concerns
    ui/
      Button.tsx
      Alert.tsx
    services/
      dateFormatService.ts
    hooks/
      useDebounce.ts
```

### Development Workflow for New Features

When adding a new feature, follow this order:

1. **Identify domain requirements**
   - What are the core business rules?
   - What data do we need?
   - What operations are allowed?

2. **Design the layers (diagram in text)**
   ```
   View: BackupSchedulerSettings.tsx
   UseCase: useBackupScheduler()
   Repository: useSchedulerRepository()
   Service: validateScheduleInterval(), calculateNextRun()
   Adapter: schedulerApiAdapter.updateInterval()
   Domain: ScheduleSettings, ScheduleValidation
   ```

3. **Implement in order:**
   - Domain models/types
   - Service layer (with tests)
   - Adapter layer
   - Repository layer
   - UseCase layer
   - View components
   - Integration tests

### Testing Strategy

**Service Layer (Unit Tests):**
```typescript
// services/backupValidationService.test.ts
describe('validateBackupNotes', () => {
  it('validates business rules', () => {
    // Test pure business logic in isolation
    expect(validateBackupNotes('').isValid).toBe(false);
    expect(validateBackupNotes('Valid notes').isValid).toBe(true);
  });
});
```

**Adapter Layer (Integration Tests with Mocks):**
```typescript
// adapters/backupApiAdapter.test.ts
describe('backupApiAdapter', () => {
  it('handles API errors gracefully', async () => {
    // Mock external HTTP calls
    vi.mock('../../services/api');

    await expect(backupApiAdapter.createBackup(invalidData))
      .rejects.toThrow('Invalid backup data');
  });
});
```

**UseCase + View (Integration Tests - User Journeys):**
```typescript
// useCases/__tests__/createBackup.integration.test.tsx
describe('Create Backup Flow', () => {
  it('completes full backup creation journey', async () => {
    // Render the view
    render(<BackupsPage />);

    // User actions
    const createButton = screen.getByRole('button', { name: /create backup/i });
    await userEvent.click(createButton);

    const notesInput = screen.getByLabelText(/notes/i);
    await userEvent.type(notesInput, 'Pre-boss fight backup');

    const submitButton = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitButton);

    // Assert visible outcomes
    await waitFor(() => {
      expect(screen.getByText(/backup created successfully/i)).toBeInTheDocument();
    });
  });
});
```

**Testing Priorities:**
- ✅ Test what users care about (flows, behavior, business rules)
- ✅ Write tests resilient to internal refactoring
- ✅ Focus on behavior, not implementation details
- ❌ Don't over-mock internal functions
- ❌ Don't couple tests to component/hook structure
- ❌ Don't chase coverage metrics at expense of clarity

### Refactoring Existing Code

When refactoring existing code to Clean Architecture:

1. **Identify the feature/use case**
2. **Extract business logic to Service layer** (pure functions)
3. **Extract API calls to Adapter layer** (hide HTTP details)
4. **Create Repository hook** if state management is complex
5. **Create UseCase hook** that orchestrates everything
6. **Simplify View** to just render and wire events
7. **Add tests** for Service layer and user journeys

**Example Refactor:**
```typescript
// BEFORE: Everything in component ❌
function BackupsList() {
  const [backups, setBackups] = useState([]);

  useEffect(() => {
    fetch('/api/backups')
      .then(res => res.json())
      .then(data => setBackups(data));
  }, []);

  const handleDelete = async (name) => {
    if (name.includes('important')) {  // Business logic in component!
      alert('Cannot delete important backups');
      return;
    }
    await fetch('/api/delete', {
      method: 'POST',
      body: JSON.stringify({ name })
    });
    setBackups(backups.filter(b => b.name !== name));
  };

  return <div>{/* JSX */}</div>;
}

// AFTER: Clean Architecture ✅

// 1. Service (business rules)
// backups/services/backupDeletionService.ts
export function canDeleteBackup(backup: Backup): { allowed: boolean; reason?: string } {
  if (backup.tags.includes('important')) {
    return { allowed: false, reason: 'Cannot delete important backups' };
  }
  return { allowed: true };
}

// 2. Adapter (API calls)
// backups/adapters/backupApiAdapter.ts
export const backupApiAdapter = {
  getBackups: () => api.get<Backup[]>('/api/backups'),
  deleteBackup: (name: string) => api.post('/api/delete', { name }),
};

// 3. Repository (state)
// backups/repository/useBackupsRepository.ts
export function useBackupsRepository() {
  const { data: backups = [], refetch } = useQuery({
    queryKey: ['backups'],
    queryFn: backupApiAdapter.getBackups,
  });
  return { backups, refetchBackups: refetch };
}

// 4. UseCase (orchestration)
// backups/useCases/useBackupsList.ts
export function useBackupsList() {
  const { backups, refetchBackups } = useBackupsRepository();

  const handleDelete = async (backup: Backup) => {
    const check = canDeleteBackup(backup);
    if (!check.allowed) {
      toast.error(check.reason);
      return;
    }

    await backupApiAdapter.deleteBackup(backup.name);
    refetchBackups();
    toast.success('Backup deleted');
  };

  return { backups, onDelete: handleDelete };
}

// 5. View (just render)
// backups/ui/BackupsList.tsx
function BackupsList() {
  const { backups, onDelete } = useBackupsList();

  return (
    <div>
      {backups.map(backup => (
        <BackupCard
          key={backup.name}
          backup={backup}
          onDelete={() => onDelete(backup)}
        />
      ))}
    </div>
  );
}
```

### Design Patterns Used

Document design patterns in JSDoc comments when implementing:

- **Singleton**: Docker client for centralized container management
- **Repository**: File system abstraction in backup service
- **Observer**: SSE broadcast system for real-time updates
- **Facade**: Simplified Docker API interactions in docker service
- **Strategy**: Theme selection (light/dark/system)
- **Service Layer**: Business logic separated from HTTP handling

### Real-Time Updates (SSE)

The application uses Server-Sent Events (SSE) instead of polling for all real-time updates:

**SSE Streams Available:**
- `/api/backups/stream` - Backup list updates
- `/api/server/status/stream` - ARK server status changes
- `/api/disk-space/stream` - Storage usage updates
- `/api/backup/health/stream` - Backup scheduler health
- `/api/restore` (POST) - Restore progress tracking

**SSE Implementation:**
- Backend: Use `setupSSEStream` helper from `utils/sseStream.ts`
- Frontend: Use `api.subscribeToBackups()`, `api.subscribeToServerStatus()`, etc.
- Always implement proper cleanup on unmount
- Handle connection errors and reconnection

### Key Configuration

**Environment Variables** (set in docker-compose.yml):
- `ARK_BACKUP_CONTAINER_NAME` - Docker container name for ARK server (default: "ark-asa")
- `PORT` - HTTP server port (default: 8080)
- `PUID` / `PGID` - File ownership (default: 1000)

**Volume Mounts** (required):
- `/backups` - Backup archive storage (read-write)
- `/save` - ARK SavedArks directory (read-only)
- `/config` - Settings configuration (read-write)
- `/var/run/docker.sock` - Docker API access (read-only)

**Configuration File** (`/config/settings.env`):
```bash
BACKUP_INTERVAL=1800        # Seconds (60-86400)
MAX_BACKUPS=3               # Count (1-100)
AUTO_SAFETY_BACKUP=true     # Boolean
```

## Code Standards

### TypeScript/React Conventions

**Mandatory Documentation:**
- Google-style JSDoc for ALL files, functions, classes, interfaces
- `@fileoverview` for file-level documentation describing purpose and patterns
- `@param`, `@returns`, `@throws`, `@async` for function documentation
- Document design patterns when used (Singleton, Repository, etc.)

**Variable Naming:**
- NO single-character variables (bad: `x`, `i`, `res`, `req`, `e`)
- Descriptive names only (good: `backupsList`, `isLoadingInitialData`, `backupIntervalSeconds`)
- Extract magic numbers/strings to named constants

**Type Safety:**
- Strict TypeScript with comprehensive type annotations
- Type all React props with interfaces
- No `any` types unless absolutely necessary

**Error Handling:**
- Comprehensive try/catch for all async operations
- Safe error messages (no sensitive information)
- User-friendly error messages via toast notifications

**Path Handling:**
- ALWAYS use Node.js `path` module for cross-platform compatibility
- Never use string concatenation for file paths

**React Patterns:**
- Functional components with hooks ONLY (no class components)
- Extract helper functions OUTSIDE components
- Use `async/await` consistently (not `.then()`)
- Custom hooks for reusable state logic

**Code Formatting:**
- Prettier configuration in `.prettierrc`:
  - Single quotes
  - Semicolons required
  - 100-character line width
  - 2-space indentation
  - LF line endings
- Run `npm run format` before committing

### Backend Module Pattern

When creating new backend functionality:

1. **Create service function** in appropriate service file
2. **Create route handler** that calls service
3. **NO business logic in routes** - only request/response handling
4. **Export service functions** for reuse across routes
5. **Document with JSDoc** including design patterns used

Example:
```typescript
// services/myService.ts
/**
 * Business logic function description.
 * @param {string} inputParameter - Description
 * @returns {Promise<ResultType>}
 * @async
 */
export async function performOperation(inputParameter: string): Promise<ResultType> {
  // Business logic here
}

// routes/myRoutes.ts
/**
 * HTTP endpoint handler.
 * Delegates to service layer.
 */
expressRouter.get('/api/endpoint', async (httpRequest, httpResponse) => {
  try {
    const result = await performOperation(httpRequest.params.input);
    httpResponse.json(result);
  } catch (error) {
    httpResponse.status(500).json({ error: 'User-friendly message' });
  }
});
```

## Important Technical Details

### File Structure Requirements

**Backup Archives:**
- Format: `.tar.gz` files in `/backups` directory
- Naming: `saves-YYYY-MM-DD_HHMMSS.tar.gz`
- Metadata: Optional `.meta.json` sidecar files with same base name

**Metadata Schema:**
```json
{
  "name": "saves-2024-01-15_120000.tar.gz",
  "created_at": 1705320000,
  "notes": "Optional user notes",
  "tags": ["optional", "tags"]
}
```

### Docker Integration

**Singleton Pattern for Docker Client:**
The Docker client in `dockerService.ts` uses singleton pattern - only one instance should exist.

**Container Control:**
- Start: No force, wait for graceful start
- Stop: 60-second timeout before force kill
- Status: Check running state via container inspection

### Responsive Design Breakpoints

- **Mobile** (`< 640px`): Card layout, vertical stacking, icon-only buttons
- **Tablet** (`≥ 640px`, `sm:` prefix): Optimized spacing
- **Desktop** (`≥ 768px`, `md:` prefix): Full table view, horizontal controls

Use Tailwind responsive prefixes: `sm:`, `md:`, `lg:`

### Performance Considerations

**SSE vs Polling:**
This application uses SSE exclusively. DO NOT implement HTTP polling for real-time data.

**State Management:**
Use custom hooks to avoid prop drilling and reduce component re-renders.

**Build Optimization:**
Multi-stage Dockerfile keeps production image small by excluding dev dependencies.

## Common Issues and Solutions

### Variable Initialization Order (React)

**Problem:** White screen / blank page due to hooks called before state declared
**Solution:** Ensure all useState declarations appear before any custom hooks that depend on them

### Docker Container Name Mismatch

If ARK container isn't named `ark-asa`, set environment variable:
```yaml
environment:
  - ARK_BACKUP_CONTAINER_NAME=your-container-name
```

### SSE Connection Issues

- SSE requires HTTP/1.1 or HTTP/2
- Check browser console for EventSource errors
- Ensure proper cleanup in useEffect hooks

### Scheduler Not Running

Check logs: `docker compose logs ark-asa-backup-web | grep scheduler`

## Security Notes

- `/save` directory MUST be read-only mount
- Docker socket access required for container control (use with caution)
- No built-in authentication - designed for LAN deployment only
- For internet exposure, use reverse proxy with authentication

## Commit Message Format

Follow Conventional Commits:
- `feat(scope): description` - New features
- `fix(scope): description` - Bug fixes
- `chore(scope): description` - Maintenance/updates
- `docs: description` - Documentation only
