# Contributing to ARK ASA Backup Manager

Thank you for your interest in contributing to the ARK: Survival Ascended Backup Manager! This document provides guidelines and standards for contributing to the project.

## Code of Conduct

- Be respectful and constructive in all interactions
- Focus on what's best for the project and community
- Accept constructive criticism gracefully
- Help newcomers get started

## Getting Started

### Prerequisites

- Node.js 20 or higher
- Docker and Docker Compose
- Basic understanding of TypeScript, React, and Express
- Familiarity with ARK: Survival Ascended dedicated servers

### Development Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   cd web
   pnpm install
   ```
3. Set up your development environment (see README.md for details)
4. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Coding Standards

### TypeScript/React Code Style

#### Formatting
- Use Prettier with the project's configuration (`.prettierrc`)
- Single quotes for strings
- 100-character line width
- Semicolons required
- Run `pnpm run format` before committing

#### Variable Naming
**CRITICAL**: Descriptive names ONLY - absolutely NO single-character variables

✅ Good Examples:
```typescript
const backupIntervalSeconds = 1800;
const maximumBackupsToRetain = 10;
const httpRequest = req;
const httpResponse = res;
const errorMessage = err.message;
const backupIndex = 0;
```

❌ Bad Examples:
```typescript
const x = 1800;              // What is x?
const i = 0;                 // Use descriptive loop variables
const res = response;        // Use httpResponse
const req = request;         // Use httpRequest
const e = error;             // Use errorMessage or specificError
```

#### Documentation
All code must have Google-style JSDoc comments:

```typescript
/**
 * @fileoverview Service for managing ARK server backups with automated scheduling.
 * Implements the Repository pattern for file system abstraction.
 */

/**
 * Creates a new backup of the ARK server save files.
 *
 * @param backupNotes - Optional notes to attach to the backup
 * @param tags - Optional tags for categorizing the backup
 * @returns Promise resolving to the backup filename
 * @throws {Error} If the save directory is not accessible
 * @async
 */
async function createBackup(
  backupNotes?: string,
  tags?: string[]
): Promise<string> {
  // Implementation
}
```

Required JSDoc tags:
- `@fileoverview` - For all files
- `@param` - For all function parameters
- `@returns` - For functions that return values
- `@throws` - For functions that throw errors
- `@async` - For async functions
- Document design patterns used (Singleton, Repository, Observer, etc.)

#### Type Safety
- Strict TypeScript enabled
- NO `any` types (use `unknown` and type guards if needed)
- Define interfaces for all data structures
- Type all function parameters and return values

```typescript
// ✅ Good
interface BackupMetadata {
  name: string;
  size_bytes: number;
  mtime: number;
  notes?: string;
  tags?: string[];
}

async function getBackups(): Promise<BackupMetadata[]> {
  // Implementation
}

// ❌ Bad
async function getBackups(): Promise<any> {
  // Implementation
}
```

#### SOLID Principles
- **Single Responsibility**: Each function/class/component should have one clear purpose
- **Open/Closed**: Open for extension, closed for modification
- **Liskov Substitution**: Subtypes must be substitutable for their base types
- **Interface Segregation**: Many specific interfaces better than one general-purpose interface
- **Dependency Inversion**: Depend on abstractions, not concretions

#### React Conventions
- Functional components with hooks ONLY (no class components)
- Custom hooks for reusable stateful logic
- Type all component props with interfaces
- Extract helper functions outside components
- Use `async/await` consistently (no mixed promise styles)

```typescript
// ✅ Good
interface BackupCardProps {
  backup: BackupMetadata;
  onDelete: (backupName: string) => Promise<void>;
  onRestore: (backupName: string) => Promise<void>;
}

export function BackupCard({ backup, onDelete, onRestore }: BackupCardProps): JSX.Element {
  // Implementation
}

// ❌ Bad
export function BackupCard(props: any) {
  // Implementation
}
```

### Backend Architecture

#### Modular Structure
- **Routes** (`routes/`) - HTTP endpoint handlers ONLY, no business logic
- **Services** (`services/`) - Business logic layer, reusable across routes
- **Utilities** (`utils/`) - Shared helper functions
- **Types** (`types/`) - Centralized TypeScript interfaces
- **Config** (`config/`) - Application constants and configuration

#### Service Layer Pattern
```typescript
// ✅ Good - Service contains business logic
export async function createBackup(notes?: string, tags?: string[]): Promise<string> {
  const timestamp = Date.now();
  const backupFileName = `saves-${timestamp}.tar.gz`;
  // ... backup logic
  return backupFileName;
}

// Route just handles HTTP
router.post('/backups/trigger', async (httpRequest, httpResponse) => {
  const { notes, tags } = httpRequest.body;
  const backupFileName = await createBackup(notes, tags);
  httpResponse.json({ success: true, backup_name: backupFileName });
});

// ❌ Bad - Business logic in route
router.post('/backups/trigger', async (req, res) => {
  const timestamp = Date.now();
  const backupFileName = `saves-${timestamp}.tar.gz`;
  // ... backup logic directly in route
});
```

## Git Workflow

### Commit Messages
Follow Conventional Commits format:

```
<type>(<scope>): <short summary>

<optional body>

<optional footer>
```

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Code style/formatting (not UI style)
- `refactor` - Code refactoring without behavior change
- `perf` - Performance improvement
- `test` - Adding or updating tests
- `chore` - Maintenance tasks

Examples:
```
feat(backup): add tag-based backup categorization
fix(ui): correct drawer opening on mobile devices
docs: update API endpoint documentation
refactor(backend): split monolithic server into modular services
```

### Pull Request Process

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feat/your-feature
   ```

2. **Make your changes** following the coding standards above

3. **Test your changes**:
   ```bash
   # Frontend
   pnpm run dev:client

   # Backend
   pnpm run dev:server

   # Production build
   pnpm run build

   # Docker build
   docker compose up -d --build ark-asa-backup-web
   ```

4. **Format your code**:
   ```bash
   pnpm run format
   ```

5. **Commit with conventional commit messages**:
   ```bash
   git add .
   git commit -m "feat(scope): add new feature"
   ```

6. **Push to your fork**:
   ```bash
   git push origin feat/your-feature
   ```

7. **Open a Pull Request** with:
   - Clear title following conventional commit format
   - Description of what changed and why
   - List of affected components
   - Screenshots (if UI changed)
   - Testing steps for reviewers
   - Reference to related issues

### Pull Request Template

```markdown
## Description
Brief description of changes and motivation

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Changes Made
- Component/file 1: what changed
- Component/file 2: what changed

## Testing Steps
1. Step 1
2. Step 2
3. Expected result

## Screenshots (if applicable)
[Attach screenshots here]

## Checklist
- [ ] Code follows project style guidelines
- [ ] Added/updated JSDoc comments
- [ ] Ran `pnpm run format`
- [ ] Tested locally (dev mode)
- [ ] Tested Docker build
- [ ] Updated documentation if needed
```

## Design Patterns

Document which design patterns you're using in your code:

- **Singleton**: Docker client, API service
- **Repository**: File system abstraction in backup service
- **Observer**: SSE broadcast system
- **Facade**: Docker API wrapper
- **Strategy**: Theme selection, sorting algorithms
- **Service Layer**: Business logic separation

Example:
```typescript
/**
 * @fileoverview Docker service implementing the Singleton and Facade patterns.
 * Provides a simplified interface to Docker API operations.
 */
```

## Testing

Currently, the project uses manual testing. When adding features:

1. Test in development mode (`pnpm run dev:client` and `pnpm run dev:server`)
2. Test production build (`pnpm run build && pnpm --filter server run start`)
3. Test Docker build (`docker compose up -d --build`)
4. Test all affected functionality manually
5. Document testing steps in your PR

## Questions?

- Open an issue for discussion
- Check existing issues and PRs
- Read the README.md and code documentation

## Recognition

Contributors will be recognized in:
- Repository contributors list
- Release notes for significant contributions
- Special thanks in documentation

Thank you for contributing! 🚀
