# AI Assistant Guidelines for This Repo

This file defines how AI assistants should behave when editing code in this repository.

It is the **source of truth** for:
- Architecture rules
- Coding standards
- Required workflows (linting, testing, docs)

You are a **senior engineer** working in a Clean Architecture, domain-oriented codebase.

---

## 1. Project Overview

**Project name:** [PROJECT_NAME]  
**Primary stack (example):**
- Frontend: TypeScript + React
- Backend: TypeScript/Node (e.g., Express/Fastify/Nest)
- Tooling: pnpm / npm / yarn (choose one and document it)
- Tests: [Jest / Vitest / Testing Library / Playwright / etc.]

> When you propose changes, align with this stack. Don’t introduce new frameworks or tools without a clear reason.

---

## 2. AI Assistant Behavior

When acting in this repo, follow these principles:

1. **Protect the architecture.**
   - Keep responsibilities in the correct layer.
   - Don’t push business logic into UI or route handlers for convenience.

2. **Prefer surgical changes.**
   - Propose minimal diffs that solve the problem.
   - Avoid rewriting large files or redesigning APIs unless explicitly requested.

3. **Keep code and docs in sync.**
   - Any change that affects behavior, APIs, or structure should include doc updates.
   - Call out which docs need updating in your response.

4. **Be explicit about assumptions.**
   - When requirements are ambiguous, state your assumptions.
   - Don’t silently pick behavior that might surprise the maintainer.

5. **Honor existing conventions.**
   - Match existing naming, file structure, and patterns.
   - If you think a convention is harmful, propose an evolution rather than ignoring it.

6. **Keep responses concise.**
   - Provide simple todo lists instead of lengthy summaries.
   - Don't create migration guides or extensive documentation unless explicitly requested.
   - Focus on code changes and essential context only.

---

## 3. Documentation Expectations

For a new project, at minimum, we maintain:

- `README.md` – High-level overview, setup, scripts, architecture summary
- `DOCS/architecture.md` – Deeper explanation of layers and data flow
- `DOCS/domain-[X].md` – Optional: domain-specific docs (per feature area)
- `CHANGELOG.md` – User-visible changes (Keep a Changelog style)
- `agents.md` – This file: AI guidelines

**When your changes include:**

- **New features / user-visible behavior**  
  → Add entry to `CHANGELOG.md` under `[Unreleased]`.

- **Architecture / folder structure changes**  
  → Update `README.md` and `DOCS/architecture.md`.

- **New or changed APIs** (HTTP routes, RPC, events, etc.)  
  → Document in an appropriate API doc (e.g., `DOCS/api.md`).

When suggesting changes, mention doc deltas, e.g.:

> “This change would require updating DOCS/architecture.md and adding an endpoint description in DOCS/api.md.”

---

## 4. Quality Gates: Linting, Formatting, Testing

Adjust this section to your actual scripts.

**Baseline expectation:**  
Changes should be **lint-clean**, **formatted**, and **tested**.

Example standard workflow (from repo root):

```bash
# Install dependencies
pnpm install

# Before coding
pnpm run lint
pnpm run test

# After coding
pnpm run format
pnpm run lint
pnpm run test
pnpm run build
```

If your actual scripts are different (e.g., `npm run lint:all`, `yarn test:unit`), replace the commands above accordingly.

AI assistants should:

- Prefer fixes that **reduce lint and type errors**.
- Avoid introducing `any` unless clearly necessary and explicitly called out.
- Suggest running the appropriate lint/test/build commands after non-trivial changes.

If commit conventions exist (e.g., Conventional Commits with Commitizen), the assistant should format suggested commit messages accordingly.

---

## 5. Clean Architecture Overview

This project uses **feature-oriented Clean Architecture** with **domain-driven** structure.

### 5.1 High-Level Structure (Example)

Adjust names to taste, but keep the *shape*:

```text
src/
  app/                # App shell, wiring, global providers
  shared/             # Cross-cutting concerns (UI, utils, services)
  features/
    [featureA]/
    [featureB]/
tests/
DOCS/
```

Each feature folder follows the same internal layers.

---

### 5.2 Feature Folder Layout

For each feature/domain:

```text
src/features/<feature-name>/
  domain/       # Types, entities, value objects, pure domain logic
  services/     # Pure business rules + policies
  adapters/     # IO (HTTP, DB, SDKs), maps to/from domain
  repository/   # State management / data access layer
  useCases/     # Application-specific orchestration
  ui/           # Presentational React components (View layer)
  index.ts      # Barrel exports (domain / useCases / ui)
```

You may not need all layers per feature at first; keep the **structure** even if some folders are empty.

---

### 5.3 Layer Responsibilities

**Domain (`domain/`):**

- Types, interfaces, enums.
- Core business concepts and invariants.
- No React, no HTTP, no IO.

**Services (`services/`):**

- Pure business logic:
  - validation
  - calculations
  - policy decisions (“can we do X?”).
- No React, no IO.

**Adapters (`adapters/`):**

- Talk to the outside world:
  - HTTP clients
  - database drivers
  - external SDKs
- Transform between external data formats and domain models.

**Repository (`repository/`):**

- Manage *where data lives*:
  - React Query, Zustand, Redux, etc.
  - SSE/WebSocket subscriptions if you have realtime.
- Expose domain-friendly APIs: `useFooRepository()`, `saveBar()`, etc.

**UseCases (`useCases/`):**

- Orchestrate:
  - glue together Repository, Services, Adapters
  - create user flows: “create item”, “delete item”, etc.
- Return view models + event handlers to UI.

**UI (`ui/`):**

- React components.
- Render data, wire event handlers.
- No business rules, no direct IO.

---

### 5.4 Dependency Direction

**Rule:** inner layers never depend on outer layers.

```text
UI (ui)            → can depend on useCases
UseCases           → can depend on repository + services + adapters
Repository         → can depend on adapters + domain
Services           → can depend on domain
Adapters           → can depend on domain
Domain             → depends on nothing
```

**Forbidden:**

- Services importing React or HTTP clients.
- Adapters importing React or UI components.
- Repository encoding business rules that belong in Services.
- UI directly calling HTTP/DB; it should go via UseCases.

When you add new code, explain which layer it belongs in and why.

---

## 6. Coding Standards

Adjust to your preferences; this is a strong default.

### 6.1 TypeScript

- Strict TypeScript mode.
- Avoid `any`; prefer domain types and generics.
- Share types in `domain/` so they’re reused across layers.

### 6.2 React

- Functional components + hooks only.
- Keep components lean; push logic downward:
  - UI = rendering and wiring events.
  - UseCases = orchestration and side-effects.
  - Services = rules and invariants.

### 6.3 Naming & Style

- Descriptive variable and function names; avoid single letters outside of tight scopes.
- Extract magic values to named constants.
- Use consistent casing:
  - camelCase for variables/functions
  - PascalCase for types and components
  - UPPER_SNAKE_CASE for constants.

### 6.4 Error Handling

- Use explicit, user-friendly error messages at UI boundaries.
- Avoid silently swallowing errors.
- In services, return rich error objects or result types rather than throwing unless necessary.

---

## 7. Testing Guidance

When proposing significant changes, hint at **where tests should go**.

**Service layer tests:**

- Pure unit tests:
  - input → output
  - test rules & invariants.

**Adapter tests:**

- Use mocks for external systems.
- Validate correct requests and mapping to domain types.
- Ensure error handling works.

**UseCase / UI tests:**

- Integration tests that drive the UI:
  - simulate user workflows
  - assert rendered output and side-effects.

Testing priorities:

- Prefer tests that cover **business behavior** and **user journeys**.
- Avoid tests that overfit internal implementation details.

---

## 8. New Feature Playbook (for AI)

When asked to design or implement a new feature:

1. **Clarify the domain concept**  
   - What entities and operations exist?
   - Capture this in `src/features/<feature>/domain/`.

2. **Define business rules**  
   - Add pure functions in `services/`.

3. **Wire external dependencies**  
   - HTTP / DB / external APIs go in `adapters/`.

4. **Create a repository hook** (if there is state to manage)  
   - Encapsulate data fetching, caching, subscriptions.

5. **Create a UseCase hook**  
   - Orchestrate flow between UI, repository, services, adapters.

6. **Build UI components**  
   - Use the UseCase hook to obtain data + actions.
   - Keep components as “dumb” as possible.

7. **Update docs and add tests**  
   - Architecture doc for new flow.
   - Service tests for business rules.
   - Integration tests for key user journeys.

You are here to **help establish and maintain a clean, testable architecture** from day one.
