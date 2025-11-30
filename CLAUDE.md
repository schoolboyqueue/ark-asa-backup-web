## Project Overview

ARK: Survival Ascended Backup Manager - A modern web application for automated backup management of ARK: Survival Ascended dedicated servers. Built with TypeScript, React, Express, and Docker with real-time monitoring via Server-Sent Events (SSE).

## 🔴 CRITICAL: Documentation Maintenance

**MANDATORY RULE:** When making ANY code changes, you MUST update the relevant documentation files:

1. **Code Changes Require Documentation Updates**:
   - Architecture changes → Update `README.md`, `client/README.md`, `server/README.md`, and this file
   - New features → Update `CHANGELOG.md` (under `[Unreleased]`)
   - File/directory moves → Update all README files and this file
   - API changes → Update `server/README.md` and `README.md`
   - Component structure changes → Update `client/README.md`

2. **Documentation Structure**:
   - **`README.md`** (root) - High-level project overview, quick start, features
   - **`client/README.md`** - Frontend implementation details, Clean Architecture guide
   - **`server/README.md`** - Backend implementation details, API documentation
   - **`CHANGELOG.md`** - Version history following Keep a Changelog format
   - **`CLAUDE.md`** (this file) - Development guidelines for AI assistants

3. **Before Completing Any Task**:
   - ✅ Verify all documentation is synchronized with code changes
   - ✅ Update CHANGELOG.md if the change is user-facing
   - ✅ Test that all internal documentation links still work
   - ✅ Run final build to ensure nothing is broken

**Never skip documentation updates.** Out-of-sync documentation is worse than no documentation.

## Development Commands

### Dependency Management (pnpm)

- Enable [Corepack](https://nodejs.org/api/corepack.html) (`corepack enable`) so Node automatically provides pnpm.
- Install all workspace dependencies from the repo root: `pnpm install` (use `pnpm install --frozen-lockfile` in CI).
- Root scripts (see `package.json`) wrap common tasks: `pnpm run dev:client`, `pnpm run dev:server`, `pnpm run build`, `pnpm run lint:all`, etc.
- Workspace-specific commands can also be executed via filters, e.g. `pnpm --filter client run dev`, `pnpm --filter server run build`.
- Use `pnpm run commit` to launch Commitizen/commitlint; never call `git commit` directly.

### Backend (Server)

```bash
# Navigate to server directory
cd server

# Install dependencies
pnpm install

# Clean install (optional, wipes node_modules)
pnpm install --frozen-lockfile

# Development (nodemon auto-restart)
pnpm run dev

# Production build
pnpm run build

# Start production server (requires build first)
pnpm --filter server run start

# Code formatting
pnpm run format

# Check formatting without changes
pnpm run format:check
```

### Frontend (Client)

```bash
# Navigate to client directory
cd client

# Install dependencies
pnpm install

# Clean install (optional)
pnpm install --frozen-lockfile

# Development (Vite HMR on port 5173)
pnpm run dev

# Production build
pnpm run build

# Preview production build
pnpm run preview

# Code formatting
pnpm run format

# Check formatting without changes
pnpm run format:check
```

### Full Stack Development

```bash
# Terminal 1 - Start backend
cd server && pnpm run dev

# Terminal 2 - Start frontend (in another terminal)
cd client && pnpm run dev

# Access application at http://localhost:5173
# API proxied to http://localhost:8080
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

## 🔴 CRITICAL: Code Quality & Linting Workflow

**MANDATORY RULE:** You MUST run linting checks before AND after making ANY code changes.

### Pre-Change Linting (REQUIRED)

Before modifying any file, ALWAYS run:

```bash
# From project root - Check everything
pnpm run lint:all

# Or check specific parts
pnpm run lint:client    # Client TypeScript + Prettier
pnpm run lint:server    # Server TypeScript + Prettier
```

### Post-Change Linting (REQUIRED)

After ANY code modification, IMMEDIATELY run:

1. **Format the code:**
```bash
# Auto-fix formatting issues
pnpm run format:all      # Format both client and server
pnpm run format:client   # Format only client
pnpm run format:server   # Format only server
```

2. **Verify type safety:**
```bash
# Check for TypeScript errors
cd client && npx tsc --noEmit
cd server && npx tsc --noEmit
```

3. **Final verification:**
```bash
# Ensure everything passes
pnpm run lint:all
```

### Linting Tools Configured

- **Prettier** - Code formatting (all .ts, .tsx, .js, .jsx, .json, .css files)
- **TypeScript Compiler** - Type checking (strict mode enabled)
- **Husky + lint-staged** - Pre-commit hooks (automatic formatting)

### Pre-Commit Hooks (Automatic)

Pre-commit hooks are configured to automatically:
- ✅ Run Prettier on all staged files
- ✅ Format code before commit
- ✅ Prevent commits with formatting issues

**Files modified by pre-commit hooks:**
- `client/src/**/*.{ts,tsx,js,jsx,json,css}`
- `server/src/**/*.{ts,js,json}`

### Common Linting Issues and Fixes

| Issue | Fix |
|-------|-----|
| Unused imports | Remove the import statement |
| Unused variables | Prefix with `_` (e.g., `_unusedVar`) or remove |
| Implicit `any` types | Add explicit type annotations |
| snake_case properties | Use camelCase (domain layer) |
| Readonly array issues | Spread to create mutable copy: `[...readonlyArray]` |
| Promise return types | Make function `async` or return `Promise<void>` |

### Workflow Integration Rules

**When Writing Code:**
1. ✅ Run `pnpm run lint:all` BEFORE starting
2. ✅ Make your changes
3. ✅ Run `pnpm run format:all` to auto-fix
4. ✅ Run `npx tsc --noEmit` in both client and server
5. ✅ Fix any remaining errors
6. ✅ Run `pnpm run lint:all` again to verify
7. ✅ Test the build: `cd client && pnpm run build && cd ../server && pnpm run build`

**When Reading Files:**
- Always note any linting issues you spot
- Fix linting issues as part of your changes
- Never leave code with linting errors

**When Creating New Files:**
- Run Prettier immediately after creation
- Ensure proper TypeScript types from the start
- Follow existing code patterns for consistency

### Emergency: Fixing All Linting Issues

If you encounter multiple linting issues:

```bash
# 1. Auto-fix all formatting
pnpm run format:all

# 2. Check TypeScript errors
cd client && npx tsc --noEmit
cd ../server && npx tsc --noEmit

# 3. Fix errors systematically:
#    - Unused imports first
#    - Type annotations second
#    - Property naming third
#    - Type compatibility last

# 4. Verify everything works
pnpm run lint:all
cd client && pnpm run build
cd ../server && pnpm run build
```

**REMEMBER:** Linting is not optional. Clean, well-formatted, type-safe code is a requirement.

## Architecture

## Project Structure

```
ark-asa-backup-web/
  server/                           # Backend Express API
    src/
      routes/                       # HTTP endpoints
      services/                     # Business logic
      config/                       # Configuration
      types/                        # TypeScript types
      utils/                        # Shared utilities
      server.ts                     # Entry point
    dist/                           # Built output
    package.json                    # Backend dependencies
    tsconfig.json

  client/                           # Frontend React App
    src/
      backups/                      # Backups domain (Clean Architecture)
        adapters/                   # API adapters
        domain/                     # Domain models and types
        hooks/                      # UI helper hooks (sort, filter, pagination)
        repository/                 # State management
        services/                   # Business logic
        ui/                         # View components
        useCases/                   # Orchestration layer
      server/                       # Server control domain (Clean Architecture)
        adapters/                   # API adapters
        domain/                     # Domain models and types
        repository/                 # State management
        services/                   # Business logic
        ui/                         # View components
        useCases/                   # Orchestration layer
      system/                       # System monitoring domain (Clean Architecture)
        domain/                     # Domain models and types
        repository/                 # State management
        ui/                         # View components
      shared/                       # Cross-domain components and utilities
        services/                   # Shared services (toast)
        ui/                         # Shared UI components (HeaderControls)
      App.tsx                       # Application root
      main.tsx                      # Entry point
    dist/                           # Built output
    package.json                    # Frontend dependencies
    tsconfig.json
    vite.config.ts

  config/                           # Deployment configs
  backups/                          # Data directory
  Dockerfile                        # Multi-stage build
  CLAUDE.md                         # This file
  README.md
```

### Backend Architecture

The backend was refactored from a 1,564-line monolith to a modular architecture with 93% reduction in file size. The architecture follows strict separation of concerns:

**Routes Layer** (`server/src/routes/`) - HTTP endpoint handlers ONLY
- No business logic, only request/response handling
- Validate inputs and delegate to services
- Express Router pattern for all routes
- Files: `healthRoutes.ts`, `settingsRoutes.ts`, `backupRoutes.ts`, `serverRoutes.ts`, `sseRoutes.ts`

**Services Layer** (`server/src/services/`) - Business logic and data operations
- Pure, testable functions where possible
- Reusable across multiple routes
- Handle all business rules and validations
- Files: `backupService.ts`, `settingsService.ts`, `dockerService.ts`, `systemService.ts`, `schedulerService.ts`

**Utilities Layer** (`server/src/utils/`) - Shared helper functions
- Reusable utilities with no business logic
- Example: SSE stream setup helpers

**Config Layer** (`server/src/config/`) - Application constants
- Centralized configuration values
- Environment variables and defaults
- Path configuration

**Types Layer** (`server/src/types/`) - TypeScript interfaces
- Centralized type definitions shared across backend

### Frontend Architecture

The frontend follows **Clean Architecture** principles with complete domain-driven design:

**Backups Domain** (`client/src/backups/`)
- `domain/` - Backup models and types (Backup, CreateBackupDto, etc.)
- `services/` - Business logic (validation, priority, formatting)
- `adapters/` - API communication layer
- `repository/` - State management with SSE updates
- `useCases/` - Orchestration (useCreateBackup, useDeleteBackup, etc.)
- `ui/` - View components (BackupsList, BackupDetailsDrawer)
- `hooks/` - UI helpers (useBackupSort, useBackupFilters, useBackupPagination, useRestoreProgress)

**Server Domain** (`client/src/server/`)
- `domain/` - Server models (Server, BackupSettings)
- `services/` - Settings validation
- `adapters/` - API communication with backend transformation
- `repository/` - State management with SSE updates
- `useCases/` - Orchestration (useServerControl, useUpdateSettings)
- `ui/` - View components (ServerControls)

**System Domain** (`client/src/system/`)
- `domain/` - System models (DiskSpace, BackupHealth, VersionInfo)
- `repository/` - State management with SSE updates
- `ui/` - View components (SystemStatus with health metrics and version display)

**Shared Layer** (`client/src/shared/`)
- `services/toast.ts` - Cross-domain toast notifications
- `ui/HeaderControls.tsx` - Composition of SystemStatus + ServerControls + theme switcher

**Application Root**
- `App.tsx` - Theme management and top-level composition
- `main.tsx` - React entry point

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

### Real Implementation Examples (Production Code)

This section documents the **actual Clean Architecture implementation** in this codebase, showing concrete examples from production features.

#### Implemented Domains

Two features have been fully refactored to Clean Architecture:

1. **Backups Domain** (`client/src/backups/`)
   - **Lines reduced**: 1,174 → 666 (43% reduction in view component)
   - **Files created**: 12 files with strict layer separation
   - **Business logic extracted**: 3 service files with pure functions

2. **Server Domain** (`client/src/server/`)
   - **Lines reduced**: 280 → 168 (40% reduction in view component)
   - **Files created**: 8 files with strict layer separation
   - **SSE integration**: Real-time server status with EventSource

#### Actual Directory Structure

```
client/src/
  backups/                                    # Backups domain
    domain/
      backup.ts                               # Domain types, DTOs, enums
    services/
      backupValidationService.ts              # Pure validation functions
      backupPriorityService.ts                # Retention policy calculations
      backupFormatService.ts                  # Date/size formatting (no dayjs)
    adapters/
      backupApiAdapter.ts                     # HTTP API + data transformation
    repository/
      useBackupsRepository.ts                 # SSE state management
    useCases/
      useCreateBackup.ts                      # Create backup orchestration
      useDeleteBackup.ts                      # Delete backup orchestration
      useBackupActions.ts                     # Restore/download actions
      useUpdateBackupMetadata.ts              # Metadata updates
    ui/
      BackupsList.tsx                         # Pure view (666 lines, was 1,174)
    index.ts                                  # Barrel exports

  server/                                     # Server control domain
    domain/
      server.ts                               # Server status + settings types
    services/
      settingsValidationService.ts            # Settings business rules
    adapters/
      serverApiAdapter.ts                     # Server + settings API
    repository/
      useServerRepository.ts                  # SSE server status
    useCases/
      useServerControl.ts                     # Start/stop orchestration
      useUpdateSettings.ts                    # Settings update orchestration
    ui/
      ServerControls.tsx                      # Pure view (168 lines, was 280)
    index.ts                                  # Barrel exports
```

#### Real Domain Layer Example

From `client/src/backups/domain/backup.ts`:

```typescript
/**
 * Core domain model for a backup archive.
 * Immutable by design with readonly properties.
 */
export interface Backup {
  readonly name: string;
  readonly sizeBytes: number;
  readonly createdAt: number;
  readonly notes?: string;
  readonly tags?: ReadonlyArray<string>;
  readonly verificationStatus: VerificationStatus;
  readonly hasMetadata: boolean;
  readonly isVerified: boolean;
}

export type VerificationStatus = 'verified' | 'failed' | 'pending' | 'unknown';

export enum BackupPriority {
  CRITICAL = 100,
  HIGH = 75,
  RECENT = 50,
  NORMAL = 25,
  LOW = 10,
}

/**
 * DTO for creating a new backup.
 */
export interface CreateBackupDto {
  readonly notes?: string;
  readonly tags?: ReadonlyArray<string>;
}
```

#### Real Service Layer Example

From `client/src/backups/services/backupValidationService.ts` (pure functions, no React):

```typescript
import type { Backup } from '../domain/backup';

export const MAX_NOTES_LENGTH = 500;
export const MAX_TAGS_COUNT = 10;

/**
 * Validates backup notes according to business rules.
 * Pure function - same input always produces same output.
 */
export function validateBackupNotes(notes: string): ValidationResult {
  if (!notes || notes.trim().length === 0) {
    return { isValid: true };
  }

  if (notes.length > MAX_NOTES_LENGTH) {
    return {
      isValid: false,
      error: `Notes must be ${MAX_NOTES_LENGTH} characters or less`,
    };
  }

  return { isValid: true };
}

/**
 * Business rule: Can only restore when server is stopped.
 */
export function canRestoreBackup(
  backup: Backup,
  isServerRunning: boolean
): ValidationResult {
  if (isServerRunning) {
    return {
      isValid: false,
      error: 'Server must be stopped before restoring backups',
    };
  }

  if (!backup.isVerified) {
    return {
      isValid: false,
      error: 'Only verified backups can be restored',
    };
  }

  return { isValid: true };
}

// Easy to unit test - no mocking required!
// expect(canRestoreBackup(backup, true).isValid).toBe(false);
```

#### Real Adapter Layer Example

From `client/src/backups/adapters/backupApiAdapter.ts`:

```typescript
import type { Backup, CreateBackupDto, UpdateMetadataDto } from '../domain/backup';

/**
 * Adapter for backup API operations.
 * Hides HTTP implementation and transforms API responses to domain models.
 */
export const backupApiAdapter = {
  /**
   * Fetch all backups from the server.
   * Transforms API format to domain format.
   */
  async getBackups(): Promise<Backup[]> {
    const response = await fetch('/api/backups');
    if (!response.ok) {
      throw new Error(`Failed to fetch backups: HTTP ${response.status}`);
    }
    const apiBackups: BackupMetadataApi[] = await response.json();
    return apiBackups.map(transformApiBackupToDomain);
  },

  /**
   * Create a new backup with optional notes and tags.
   */
  async createBackup(dto: CreateBackupDto): Promise<void> {
    const response = await fetch('/api/backups/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notes: dto.notes || '',
        tags: dto.tags || [],
      }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to create backup');
    }
  },

  /**
   * Delete a backup by name.
   */
  async deleteBackup(backupName: string): Promise<void> {
    const response = await fetch('/api/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ backup_name: backupName }),
    });
    if (!response.ok) {
      throw new Error('Failed to delete backup');
    }
  },
};

/**
 * Transform API response format to domain model.
 * Centralizes data transformation logic.
 */
function transformApiBackupToDomain(apiBackup: BackupMetadataApi): Backup {
  return {
    name: apiBackup.name,
    sizeBytes: apiBackup.size_bytes,
    createdAt: apiBackup.created_at,
    notes: apiBackup.notes,
    tags: apiBackup.tags,
    verificationStatus: apiBackup.verification_status,
    hasMetadata: apiBackup.has_metadata,
    isVerified: apiBackup.verification_status === 'verified',
  };
}
```

#### Real Repository Layer Example (SSE)

From `client/src/backups/repository/useBackupsRepository.ts` (SSE state management):

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';
import type { Backup } from '../domain/backup';

/**
 * Repository hook for backup state management.
 * Subscribes to SSE for real-time updates.
 */
export function useBackupsRepository(): UseBackupsRepositoryReturn {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connectToBackupsStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const eventSource = new EventSource('/api/backups/stream');
    eventSourceRef.current = eventSource;

    eventSource.addEventListener('connected', () => {
      console.log('[BackupsRepository] SSE connected');
      setError(null);
    });

    eventSource.addEventListener('backups', (messageEvent) => {
      const apiBackups = JSON.parse(messageEvent.data);
      const domainBackups = apiBackups.map(transformApiBackupToDomain);
      const sortedBackups = sortBackupsByDate(domainBackups);
      setBackups(sortedBackups);
      setIsLoading(false);
      setError(null);
    });

    eventSource.addEventListener('error', (messageEvent) => {
      const data = JSON.parse((messageEvent as MessageEvent).data || '{}');
      const errorMessage = data.error || 'Failed to load backups';
      console.error('[BackupsRepository] SSE error:', errorMessage);
      setError(errorMessage);
      setIsLoading(false);
    });

    eventSource.onerror = () => {
      console.error('[BackupsRepository] SSE connection error');
      setError('Lost connection to server');
      eventSource.close();
    };
  }, []);

  // Connect on mount, cleanup on unmount
  useEffect(() => {
    connectToBackupsStream();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [connectToBackupsStream]);

  // Optimistic updates for mutations
  const updateBackup = useCallback((updatedBackup: Backup) => {
    setBackups((currentBackups) =>
      currentBackups.map((backup) =>
        backup.name === updatedBackup.name ? updatedBackup : backup
      )
    );
  }, []);

  const removeBackup = useCallback((backupName: string) => {
    setBackups((currentBackups) =>
      currentBackups.filter((backup) => backup.name !== backupName)
    );
  }, []);

  return {
    backups,
    isLoading,
    error,
    refreshBackups: connectToBackupsStream,
    updateBackup,
    removeBackup,
  };
}
```

#### Real UseCase Layer Example

From `client/src/backups/useCases/useDeleteBackup.ts` (orchestration):

```typescript
import { useState, useCallback } from 'react';
import { backupApiAdapter } from '../adapters/backupApiAdapter';
import { canDeleteBackup } from '../services/backupValidationService';
import { toast } from '../../services/toast';
import type { Backup } from '../domain/backup';

/**
 * UseCase hook for deleting backups.
 * Orchestrates validation, API calls, and user feedback.
 */
export function useDeleteBackup(): UseDeleteBackupReturn {
  const [deletingBackupName, setDeletingBackupName] = useState<string | null>(null);

  const deleteBackup = useCallback(
    async (backup: Backup, onSuccess?: () => void): Promise<void> => {
      // 1. Validate using Service layer
      const validation = canDeleteBackup(backup);
      if (!validation.isValid) {
        toast.error(validation.error || 'Cannot delete this backup');
        return;
      }

      setDeletingBackupName(backup.name);

      try {
        // 2. Call Adapter to perform side-effect
        await backupApiAdapter.deleteBackup(backup.name);

        // 3. User feedback
        toast.success(`Backup deleted successfully`);

        // 4. Execute success callback (e.g., close modal)
        onSuccess?.();
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete backup';
        console.error('Failed to delete backup:', error);
        toast.error(errorMessage);
        throw error;
      } finally {
        setDeletingBackupName(null);
      }
    },
    []
  );

  const isDeleting = useCallback(
    (backupName: string): boolean => {
      return deletingBackupName === backupName;
    },
    [deletingBackupName]
  );

  return {
    deletingBackupName,
    isDeleting,
    deleteBackup,
    canDelete: canDeleteBackup,
  };
}
```

#### Real View Layer Example

From `client/src/backups/ui/BackupsList.tsx` (pure view, 666 lines, reduced from 1,174):

```typescript
export default function BackupsList({ serverStatus }: BackupsListProps): JSX.Element {
  // REPOSITORY - Get data and real-time updates
  const { backups, isLoading, error } = useBackupsRepository();

  // USE CASES - Get orchestration logic and actions
  const createBackup = useCreateBackup();
  const deleteBackup = useDeleteBackup();
  const backupActions = useBackupActions();
  const updateMetadata = useUpdateBackupMetadata();

  // LOCAL VIEW STATE - Modal visibility, animations, UI-only state
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [selectedBackupForDelete, setSelectedBackupForDelete] = useState<Backup | null>(null);
  const [isDetailsDrawerOpen, setIsDetailsDrawerOpen] = useState(false);

  // EVENT HANDLERS - Wire UI events to UseCase actions
  const handleCreateBackup = async () => {
    await createBackup.actions.handleSubmit();
  };

  const handleDeleteClick = (backup: Backup) => {
    setSelectedBackupForDelete(backup);
    setIsDeleteModalVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedBackupForDelete) return;
    await deleteBackup.deleteBackup(selectedBackupForDelete, () => {
      setIsDeleteModalVisible(false);
      setSelectedBackupForDelete(null);
    });
  };

  const handleRestore = async (backup: Backup) => {
    await backupActions.handleRestore(backup, serverStatus?.isRunning || false);
  };

  // RENDER - Pure JSX, no business logic
  return (
    <Card className="flex-1">
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Backups</h2>
          <Button
            onPress={handleCreateBackup}
            isLoading={createBackup.isCreating}
            color="primary"
          >
            Create Backup
          </Button>
        </div>
      </CardHeader>

      <CardBody>
        {error && <Alert color="danger">{error}</Alert>}

        <Table aria-label="Backups table">
          <TableHeader>
            <TableColumn>NAME</TableColumn>
            <TableColumn>SIZE</TableColumn>
            <TableColumn>CREATED</TableColumn>
            <TableColumn>ACTIONS</TableColumn>
          </TableHeader>
          <TableBody
            items={backups}
            isLoading={isLoading}
            emptyContent="No backups found"
          >
            {(backup) => (
              <TableRow key={backup.name}>
                <TableCell>{backup.name}</TableCell>
                <TableCell>{formatFileSize(backup.sizeBytes)}</TableCell>
                <TableCell>{formatTimestamp(backup.createdAt)}</TableCell>
                <TableCell>
                  <ButtonGroup size="sm">
                    <Button onPress={() => handleRestore(backup)}>Restore</Button>
                    <Button onPress={() => handleDeleteClick(backup)}>Delete</Button>
                  </ButtonGroup>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardBody>

      {/* Delete confirmation modal */}
      <Modal isOpen={isDeleteModalVisible} onClose={() => setIsDeleteModalVisible(false)}>
        <ModalContent>
          <ModalHeader>Confirm Delete</ModalHeader>
          <ModalBody>
            Are you sure you want to delete {selectedBackupForDelete?.name}?
          </ModalBody>
          <ModalFooter>
            <Button onPress={() => setIsDeleteModalVisible(false)}>Cancel</Button>
            <Button
              color="danger"
              onPress={handleConfirmDelete}
              isLoading={deleteBackup.isDeleting(selectedBackupForDelete?.name || '')}
            >
              Delete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Card>
  );
}
```

#### Refactoring Results

**Backups Feature:**
- **Before**: 1,174 lines in single component with mixed concerns
- **After**: 666 lines pure view + 11 layer files (1,982 total lines)
- **Reduction**: 43% reduction in view component
- **Benefits**:
  - All business logic now testable without React
  - SSE connection encapsulated in repository
  - Validation rules extracted to pure functions
  - API calls hidden behind adapter interface

**Server Feature:**
- **Before**: 280 lines in single component with validation and API calls
- **After**: 168 lines pure view + 7 layer files
- **Reduction**: 40% reduction in view component
- **Benefits**:
  - Settings validation is pure functions (easy to test)
  - Server control orchestration separated from UI
  - SSE server status managed in repository

#### Guidelines for New Features

When implementing new features in this codebase:

1. **Create feature directory**: `client/src/<feature-name>/`

2. **Start with Domain layer**:
   ```typescript
   // domain/<feature>.ts
   export interface MyEntity { readonly id: string; /* ... */ }
   export interface MyDto { /* ... */ }
   export type MyStatus = 'active' | 'inactive';
   ```

3. **Extract business rules to Services**:
   ```typescript
   // services/myValidationService.ts
   export function validateMyEntity(entity: MyEntity): ValidationResult {
     // Pure function - no React, no IO
   }
   ```

4. **Create Adapter for external systems**:
   ```typescript
   // adapters/myApiAdapter.ts
   export const myApiAdapter = {
     async getEntities(): Promise<MyEntity[]> { /* ... */ },
   };
   ```

5. **Create Repository for state**:
   ```typescript
   // repository/useMyRepository.ts
   export function useMyRepository() {
     // SSE or React Query
     const [entities, setEntities] = useState<MyEntity[]>([]);
     // ...
   }
   ```

6. **Create UseCases for orchestration**:
   ```typescript
   // useCases/useMyFeature.ts
   export function useMyFeature() {
     const { entities } = useMyRepository();
     const handleAction = async () => {
       const validation = validateMyEntity(/* ... */);
       await myApiAdapter.performAction(/* ... */);
       toast.success('Done!');
     };
     return { entities, handleAction };
   }
   ```

7. **Create View components** (pure JSX):
   ```typescript
   // ui/MyFeature.tsx
   export function MyFeature() {
     const { entities, handleAction } = useMyFeature();
     return <div>{/* Just render */}</div>;
   }
   ```

8. **Export via barrel file**:
   ```typescript
   // index.ts
   export type { MyEntity, MyDto } from './domain/myFeature';
   export { validateMyEntity } from './services/myValidationService';
   export { useMyFeature } from './useCases/useMyFeature';
   // Don't export Adapter - internal implementation detail
   ```

#### Testing the Architecture

**Service Layer Tests** (pure functions, no mocking needed):
```typescript
// services/__tests__/backupValidationService.test.ts
import { validateBackupNotes, MAX_NOTES_LENGTH } from '../backupValidationService';

describe('validateBackupNotes', () => {
  it('accepts valid notes', () => {
    const result = validateBackupNotes('Valid backup notes');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects notes that are too long', () => {
    const longNotes = 'x'.repeat(MAX_NOTES_LENGTH + 1);
    const result = validateBackupNotes(longNotes);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('500 characters');
  });

  it('accepts empty notes', () => {
    const result = validateBackupNotes('');
    expect(result.isValid).toBe(true);
  });
});
```

**UseCase Integration Tests** (test user journeys):
```typescript
// useCases/__tests__/useDeleteBackup.test.tsx
import { renderHook, waitFor } from '@testing-library/react';
import { useDeleteBackup } from '../useDeleteBackup';
import { backupApiAdapter } from '../../adapters/backupApiAdapter';

vi.mock('../../adapters/backupApiAdapter');

describe('useDeleteBackup', () => {
  it('validates before deletion', async () => {
    const { result } = renderHook(() => useDeleteBackup());

    const protectedBackup = {
      name: 'important.tar.gz',
      tags: ['important'],
      /* ... */
    };

    await result.current.deleteBackup(protectedBackup);

    // Should not call API for protected backups
    expect(backupApiAdapter.deleteBackup).not.toHaveBeenCalled();
  });

  it('deletes valid backup and shows success message', async () => {
    const { result } = renderHook(() => useDeleteBackup());
    const normalBackup = { name: 'normal.tar.gz', tags: [], /* ... */ };

    await result.current.deleteBackup(normalBackup);

    await waitFor(() => {
      expect(backupApiAdapter.deleteBackup).toHaveBeenCalledWith('normal.tar.gz');
      // Verify toast.success was called
    });
  });
});
```

### Design Patterns Used

Document design patterns in JSDoc comments when implementing:

- **Singleton**: Docker client for centralized container management
- **Repository**: File system abstraction in backup service, SSE state management in frontend
- **Observer**: SSE broadcast system for real-time updates
- **Facade**: Simplified Docker API interactions in docker service
- **Strategy**: Theme selection (light/dark/system)
- **Service Layer**: Business logic separated from HTTP handling (both backend and frontend)
- **Adapter**: External system integration with data transformation (frontend API layer)
- **UseCase**: Orchestration pattern for complex user interactions (frontend)

### Real-Time Updates (SSE)

The application uses Server-Sent Events (SSE) instead of polling for all real-time updates:

**SSE Streams Available:**
- `/api/stream` - Unified SSE stream (recommended - all events in one connection)
- `/api/backups/stream` - Backup list updates (legacy)
- `/api/server/status/stream` - ARK server status changes (legacy)
- `/api/disk-space/stream` - Storage usage updates (legacy)
- `/api/backup/health/stream` - Backup scheduler health (legacy)
- `/api/restore` (POST) - Restore progress tracking

**SSE Event Types (Unified Stream):**
- `connected` - Connection established
- `backups` - Backup list updated
- `status` - Server status changed
- `health` - Scheduler health updated
- `diskspace` - Storage usage updated
- `version` - Server version info (sent once on connection)
- `error` - Error occurred

**SSE Implementation:**
- Backend: Use `setupSSEStream` helper from `utils/sseStream.ts`
- Frontend: Use `useUnifiedSSE` hook from `shared/hooks/useUnifiedSSE.ts`
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
- Run `pnpm run format` before committing

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

- Always run `pnpm run commit` (Commitizen + `@commitlint/cz-commitlint`) instead of `git commit`; it guides you through type/scope/message entry.
- Valid scopes are auto-detected from workspaces (`client`, `server`) plus `deps`, `dev-deps`, `release`. Multiple scopes are allowed in the prompt.
- Husky hooks automatically run `npx lint-staged` before the commit and `npx commitlint --edit "$1"` afterwards, so you cannot bypass formatting or Conventional Commit validation.
- Standard Conventional Commit types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, etc. Use `!` or `BREAKING CHANGE:` footer when needed.

### Release Automation

- Versions/changelogs are managed via `.simple-release.json` using `@simple-release/npm` in fixed mode across the workspaces.
- `.github/workflows/release.yml` runs on pushes to `main` and issue comments to open/update a release PR (`check` + `pull-request` jobs) and publish (`release` job) once merged.
- Ensure repository secrets include `NPM_TOKEN`; GitHub supplies `GITHUB_TOKEN` automatically for tagging and PR updates.
- Dependabot/Renovate commits should use `fix(deps): ...` or `fix(dev-deps): ...` so extra scopes trigger the correct bump.
