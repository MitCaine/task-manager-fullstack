# Repository Tour

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | New and returning contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide identifies the repository's runtime roots, ownership boundaries, and
the shortest reading path for common changes.

## Repository At A Glance

```text
.
|-- src/main/java/com/example/taskmanager/   Spring Boot API and JPA entities
|-- src/main/resources/                      Backend configuration and SQL updates
|-- src/test/                                Backend controller/repository tests
|-- SQL Files/                               MySQL baseline schema
|-- taskmanager-frontend/src/                React application and repository layer
|-- taskmanager-frontend/ios/                Generated/synced Capacitor iOS project
|-- scripts/                                 Cross-project verification commands
|-- docs/                                    Canonical guides and historical records
`-- .github/workflows/                       Continuous integration
```

## Runtime Roots

| Runtime | Entry point | Follow next |
| --- | --- | --- |
| Spring Boot | `TaskManagerApplication.java` | Controllers, JPA repositories, entities |
| React | `taskmanager-frontend/src/index.tsx` | `RepositoryProvider`, then `App.tsx` |
| REST persistence | `createRestRepositories.ts` | API repositories, mappers, `api/tasks.ts` transport |
| SQLite persistence | `runtimeRepositories.ts` | `SQLiteDatabaseService`, factory, repositories |
| iOS shell | `capacitor.config.ts` and Xcode project | Built React assets plus Capacitor plugins |

## Frontend Ownership

`App.tsx` composes the main task, creation, calendar, settings, and dialog
surfaces. Workflow hooks own bounded stateful operations:

- `useCreateTaskWorkflow`: task creation, recurrence setup, and tag assignment.
- `useInlineEditWorkflow`: edit drafts, explicit Save, tags, projects, recurrence.
- `useProjectTagCatalog`: catalog loading and mutations.
- `useTaskDetailResources`: child-resource persistence and local maps.
- `useTaskListViewModel`: filtering, sorting, statistics, and empty-state derivation.
- `useBulkSelection`: task selection state.

Presentation belongs in `components/`; deterministic calculations belong in
`utils/`. Components receive data and callbacks rather than selecting a
persistence implementation.

## Persistence Ownership

Frontend persistence starts at `repositories/contracts.ts`. The App and hooks
obtain the complete `Repositories` aggregate through `useRepositories()`.

- `repositories/api/` adapts the contracts to the Spring REST API.
- `repositories/sqlite/` implements the same contracts over SQLite.
- `repositories/legacyAdapters.ts` converts domain models to the older numeric UI
  model still consumed by `App.tsx`.
- `api/tasks.ts` is HTTP transport for the REST adapter; it is not the application
  persistence boundary.

## Backend Ownership

The backend deliberately uses controllers directly with Spring Data repositories.
There is no service layer. Cross-entity controller behavior currently includes
tag association and recurrence management. Child-resource controllers use
`ParentTaskGuard` to reject missing task parents.

## Where New Code Belongs

| Change | Primary location |
| --- | --- |
| New visual element | `taskmanager-frontend/src/components/` |
| Stateful frontend workflow | A focused hook under `src/hooks/` |
| Deterministic formatting or calculation | `src/utils/` with focused tests |
| Persistence capability | Domain model/input, repository contract, both adapters, shared contract tests |
| REST representation mismatch | `repositories/api/mappers/` |
| SQLite schema change | Forward-only migration plus repository tests |
| Backend endpoint | Controller, entity/repository as needed, controller tests |
| iOS lifecycle behavior | Platform or SQLite driver boundary, not a component |

## Common Reading Paths

### Change task creation

`CreateTaskCard.tsx` -> `useCreateTaskWorkflow.ts` -> repository contracts ->
selected adapter -> backend controller or SQLite repository.

### Change task editing

`InlineTaskEditCard.tsx` -> `useInlineEditWorkflow.ts` -> task/recurrence
repositories. Editing is explicit Save; there is no active autosave path.

### Change persistence

Read [Repository Architecture](architecture/repositories.md), then the shared
contract suite for the affected repository before changing either implementation.

### Change mobile interaction

Read [Mobile and iOS Architecture](architecture/mobile-ios.md) before editing
focus, swipe, viewport, safe-area, or keyboard behavior.

## What To Ignore

- `target/`, `taskmanager-frontend/build/`, and synced iOS web assets are generated.
- `taskmanager-frontend/ios/App/CapApp-SPM/README.md` is generated plugin metadata.
- `docs/history/` is context, not current implementation authority.
- IDE metadata and local assistant histories are not runtime architecture.

## Related Documents

- [Architecture Overview](architecture/overview.md)
- [Development Workflow](development/workflow.md)
- [Testing Guide](development/testing.md)
