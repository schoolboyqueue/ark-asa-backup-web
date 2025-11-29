# ARK ASA Backup Manager - Frontend

React 18 frontend with TypeScript, implementing Clean Architecture principles for maintainable, testable code.

## Architecture Overview

### Clean Architecture (Nik Sumeiko Style)

The frontend follows **Clean Architecture** with strict functional layer separation:

```
client/src/
├── backups/                    # Backups domain
│   ├── domain/                 # Domain models (framework-agnostic)
│   ├── services/               # Pure business logic
│   ├── adapters/               # API communication
│   ├── repository/             # State management
│   ├── useCases/               # Orchestration layer
│   ├── ui/                     # React components (View layer)
│   └── hooks/                  # UI helper hooks
├── server/                     # Server control domain
├── system/                     # System monitoring domain
└── shared/                     # Cross-domain utilities
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

## Layer Responsibilities

### 1. Domain Layer (`domain/`)

**Location:** `<feature>/domain/`

**Purpose:** Define domain models and types (framework-agnostic)

```typescript
// backups/domain/backup.ts
export interface Backup {
  readonly name: string;
  readonly sizeBytes: number;
  readonly createdAt: number;
  readonly notes?: string;
  readonly tags?: readonly string[];
}
```

**Rules:**
- ❌ NO React imports
- ❌ NO framework dependencies
- ❌ NO side effects
- ✅ Pure TypeScript interfaces and types only

### 2. Service Layer (`services/`)

**Location:** `<feature>/services/`

**Purpose:** Pure business logic and validation

```typescript
// backups/services/backupValidationService.ts
export function validateBackupNotes(notes: string): ValidationResult {
  if (notes.length > 500) {
    return { isValid: false, error: 'Notes too long' };
  }
  return { isValid: true };
}
```

**Rules:**
- ✅ Pure, deterministic functions
- ✅ Same input = same output
- ✅ Easy to unit test
- ❌ NO React imports
- ❌ NO API calls
- ❌ NO side effects

### 3. Adapter Layer (`adapters/`)

**Location:** `<feature>/adapters/`

**Purpose:** Talk to external systems (HTTP, APIs)

```typescript
// backups/adapters/backupApiAdapter.ts
export const backupApiAdapter = {
  async getBackups(): Promise<Backup[]> {
    const response = await fetch('/api/backups');
    const data = await response.json();
    return transformApiToDomain(data);
  },
};
```

**Rules:**
- ✅ Hide external API details
- ✅ Transform API responses to domain models
- ❌ NO React hooks
- ❌ NO business rules

### 4. Repository Layer (`repository/`)

**Location:** `<feature>/repository/`

**Purpose:** Manage state and data access

```typescript
// backups/repository/useBackupsRepository.ts
export function useBackupsRepository() {
  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['backups'],
    queryFn: () => backupApiAdapter.getBackups(),
  });

  return { backups, isLoading, refetchBackups };
}
```

**Rules:**
- ✅ Encapsulate state management
- ✅ Handle caching and invalidation
- ✅ Provide stable APIs
- ❌ NO business logic (that's Service layer)

### 5. UseCase Layer (`useCases/`)

**Location:** `<feature>/useCases/`

**Purpose:** Orchestrate business flows

```typescript
// backups/useCases/useCreateBackup.ts
export function useCreateBackup() {
  const { backups, addBackup } = useBackupsRepository();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (notes: string) => {
    // 1. Validate with Service
    const validation = validateBackupNotes(notes);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // 2. Call Adapter
    setIsLoading(true);
    const result = await backupApiAdapter.createBackup({ notes });

    // 3. Update state via Repository
    addBackup(result);

    // 4. User feedback
    toast.success('Backup created!');
    setIsLoading(false);
  };

  return { handleSubmit, isLoading };
}
```

**Rules:**
- ✅ Orchestrate flow between layers
- ✅ Handle loading states and errors
- ✅ Provide user feedback
- ❌ NO rendering logic

### 6. View Layer (`ui/`)

**Location:** `<feature>/ui/`

**Purpose:** Render JSX and wire events

```typescript
// backups/ui/CreateBackupForm.tsx
export function CreateBackupForm() {
  const { handleSubmit, isLoading } = useCreateBackup();

  return (
    <form onSubmit={handleSubmit}>
      <Input ... />
      <Button isLoading={isLoading}>Create</Button>
    </form>
  );
}
```

**Rules:**
- ✅ Just render - minimal logic
- ✅ Wire DOM events to UseCase callbacks
- ❌ NO fetch/axios calls
- ❌ NO business rules
- ❌ NO complex transformations

## Domains

### Backups Domain

**Purpose:** Backup CRUD operations and management

**Layers:**
- `domain/` - Backup, CreateBackupDto, UpdateBackupMetadataDto
- `services/` - Validation, priority calculation, formatting
- `adapters/` - backupApiAdapter (HTTP calls)
- `repository/` - useBackupsRepository (state + SSE)
- `useCases/` - useCreateBackup, useDeleteBackup, useBackupActions, useUpdateBackupMetadata
- `ui/` - BackupsList, BackupDetailsDrawer
- `hooks/` - useBackupSort, useBackupFilters, useBackupPagination, useRestoreProgress

### Server Domain

**Purpose:** ARK server control and settings

**Layers:**
- `domain/` - Server, BackupSettings, UpdateSettingsDto
- `services/` - Settings validation
- `adapters/` - serverApiAdapter (HTTP + transformation)
- `repository/` - useServerRepository (state + SSE)
- `useCases/` - useServerControl, useUpdateSettings
- `ui/` - ServerControls

### System Domain

**Purpose:** System health and version monitoring

**Layers:**
- `domain/` - DiskSpace, BackupHealth, VersionInfo
- `repository/` - useSystemRepository (state + SSE)
- `ui/` - SystemStatus (displays health metrics and version info)

### Shared Layer

**Purpose:** Cross-domain utilities

**Structure:**
- `services/toast.ts` - Toast notifications (used by all domains)
- `ui/HeaderControls.tsx` - Composition component (SystemStatus + ServerControls + theme)

## Development

### Prerequisites

- Node.js 20+
- npm or yarn

### Setup

```bash
cd client

# Install dependencies
npm install

# Development (HMR enabled)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

### Development Server

- **URL:** http://localhost:5173
- **HMR:** Instant updates on file save
- **Port:** Configurable in vite.config.ts

## Technology Stack

### Core

- **React** 18 - UI framework
- **TypeScript** 5 - Type safety
- **Vite** 5 - Build tool with fast HMR

### UI

- **Hero UI** - Component library (NextUI fork)
- **Tailwind CSS** - Utility-first CSS
- **Heroicons** - Icon set (24px solid)

### State & Data

- **React Query** - Server state management (in repositories)
- **Custom Hooks** - Local state management
- **SSE (EventSource)** - Real-time updates

### Utilities

- **Day.js** - Date formatting with relativeTime
- **TypeScript** - Strict mode enabled

## Code Standards

### React Conventions

- **Functional components only** - No class components
- **TypeScript strict mode** - All types required
- **Props interfaces** - All components have typed props
- **Hooks** - useCallback, useMemo for optimization
- **Async/await** - Consistent async handling (no .then())

### Clean Architecture Rules

**When creating a new feature:**

1. **Define domain models** (`domain/`)
2. **Write service logic** (`services/`) with tests
3. **Create adapter** (`adapters/`) for API calls
4. **Build repository** (`repository/`) for state
5. **Implement UseCase** (`useCases/`) for orchestration
6. **Create View** (`ui/`) components

**Testing Priority:**
- ✅ Service layer (unit tests - pure functions)
- ✅ User journeys (integration tests)
- ✅ Behavior over implementation

### File Naming

- **Components:** PascalCase (e.g., `BackupsList.tsx`)
- **Hooks:** camelCase with `use` prefix (e.g., `useBackupSort.ts`)
- **Services:** camelCase with `Service` suffix (e.g., `backupValidationService.ts`)
- **Types:** PascalCase (e.g., `Backup`, `CreateBackupDto`)

### Documentation

**Required JSDoc:**

```typescript
/**
 * @fileoverview File-level description with purpose and patterns
 */

/**
 * Function description.
 *
 * @param {string} input - Description
 * @returns {Result} Description
 * @throws {Error} When ...
 * @async
 *
 * @example
 * ```typescript
 * const result = doSomething('input');
 * ```
 */
export async function doSomething(input: string): Promise<Result> {
  // Implementation
}
```

### Formatting

```bash
# Format code
npm run format

# Check formatting
npm run format:check
```

**Prettier Config:**
- Single quotes
- Semicolons required
- 100-character line width
- 2-space indentation
- LF line endings

## UI Components

### Layout

- **App.tsx** - Theme management, global providers
- **HeaderControls** - Status monitoring + controls + theme switcher

### Backups Domain

- **BackupsList** - Table/cards with actions
- **BackupDetailsDrawer** - Slideout with metadata editing

### Server Domain

- **ServerControls** - Start/stop + settings modal

### System Domain

- **SystemStatus** - Health indicator with popover

## State Management Patterns

### Repository Pattern

All domain repositories follow this pattern:

```typescript
export function use<Domain>Repository() {
  // React Query for server state
  const { data, isLoading } = useQuery(...);

  // SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource('/api/stream');
    eventSource.addEventListener('update', (e) => {
      queryClient.setQueryData(['key'], JSON.parse(e.data));
    });
    return () => eventSource.close();
  }, []);

  return {
    // Data in domain language
    items: data,
    isLoading,

    // Operations in domain language
    refresh: () => queryClient.invalidateQueries(['key']),
  };
}
```

### UseCase Pattern

All UseCases follow this pattern:

```typescript
export function use<Action><Domain>() {
  const repository = use<Domain>Repository();
  const [state, setState] = useState(...);

  const handleAction = useCallback(async (input) => {
    // 1. Validate with Service
    const validation = validateInput(input);
    if (!validation.isValid) {
      toast.error(validation.error);
      return;
    }

    // 2. Call Adapter
    setState({ loading: true });
    const result = await adapter.doAction(input);

    // 3. Update via Repository
    repository.update(result);

    // 4. User feedback
    toast.success('Action completed!');
    setState({ loading: false });
  }, []);

  return { handleAction, state };
}
```

## Responsive Design

### Breakpoints

- **Mobile** (`< 640px`): Card layout, vertical stacking
- **Tablet** (`≥ 640px`, `sm:`): Optimized spacing
- **Desktop** (`≥ 768px`, `md:`): Full table view

### Tailwind Responsive Classes

```tsx
<div className="flex flex-col sm:flex-row md:gap-4">
  {/* Mobile: column, Tablet+: row */}
</div>
```

## Real-Time Updates

### SSE Integration

All repositories use EventSource for real-time updates:

```typescript
useEffect(() => {
  const eventSource = new EventSource('/api/backups/stream');

  eventSource.addEventListener('backups', (event) => {
    const data = JSON.parse(event.data);
    queryClient.setQueryData(['backups'], data);
  });

  eventSource.addEventListener('error', () => {
    console.error('SSE connection error');
    eventSource.close();
  });

  return () => eventSource.close();
}, []);
```

### SSE Events

- `connected` - Connection established
- `backups` - Backup list updated
- `status` - Server status changed
- `health` - Scheduler health updated
- `diskspace` - Storage usage updated
- `version` - Server version info (sent once on connection)

## Theme System

### Theme Modes

- **Light** - Light color scheme
- **Dark** - Dark color scheme
- **System** - Follow OS preference

### Implementation

```typescript
// App.tsx
const [themeMode, setThemeMode] = useState<ThemeMode>('dark');

useEffect(() => {
  const theme = themeMode === 'system'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    : themeMode;

  document.documentElement.classList.toggle('dark', theme === 'dark');
}, [themeMode]);
```

## Performance Optimizations

- **Code splitting** - Vite dynamic imports
- **Lazy loading** - React.lazy for routes
- **Memoization** - useMemo/useCallback for expensive operations
- **SSE vs Polling** - Eliminates periodic HTTP requests
- **Repository caching** - React Query automatic caching

## Build Optimization

### Production Build

```bash
npm run build
```

**Output:**
- `dist/` - Static assets
- Minified JavaScript
- CSS extraction
- Source maps for debugging

### Bundle Analysis

Check bundle size warnings in build output. Consider:
- Dynamic imports for code splitting
- Tree shaking (automatic with Vite)
- Manual chunks for better caching

## Testing Guidelines

### Service Layer (Unit Tests)

```typescript
// services/__tests__/backupValidationService.test.ts
describe('validateBackupNotes', () => {
  it('rejects empty notes', () => {
    expect(validateBackupNotes('').isValid).toBe(false);
  });

  it('accepts valid notes', () => {
    expect(validateBackupNotes('Valid').isValid).toBe(true);
  });
});
```

### User Journeys (Integration Tests)

```typescript
// __tests__/createBackup.test.tsx
describe('Create Backup Flow', () => {
  it('creates backup successfully', async () => {
    render(<BackupsPage />);

    const createBtn = screen.getByRole('button', { name: /create/i });
    await userEvent.click(createBtn);

    const notesInput = screen.getByLabelText(/notes/i);
    await userEvent.type(notesInput, 'Test backup');

    const submitBtn = screen.getByRole('button', { name: /submit/i });
    await userEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/created successfully/i)).toBeInTheDocument();
    });
  });
});
```

## Troubleshooting

### White Screen

Check browser console for errors. Common causes:
- Missing dependencies
- Variable initialization order
- Hook dependency arrays

### SSE Connection Issues

- Check browser console for EventSource errors
- Verify backend SSE endpoint is running
- SSE requires HTTP/1.1 or HTTP/2

### Type Errors

```bash
# Type check without build
npx tsc --noEmit
```

### Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

## Contributing

See main [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

### Frontend-Specific Guidelines

- Follow Clean Architecture strictly
- Services must be pure functions (easy to test)
- No business logic in components
- All new features require domain structure
- Document with JSDoc
- Use TypeScript strictly (no `any`)
- Run formatter before committing

## Additional Resources

- [Clean Architecture Guide](../CLAUDE.md#clean-architecture-principles) - Full architecture documentation
- [Hero UI Docs](https://www.heroui.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [React Query](https://tanstack.com/query/latest) - Server state management
