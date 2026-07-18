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

## Typical Change Walkthroughs

These walkthroughs are navigation maps, not implementation recipes. Start from
the public behavior and ownership boundary, then follow the links to the canonical
detail rather than inferring architecture from one implementation.

### Adding A New Task Field

- **Begin with:** Decide whether the value is persisted domain state, derived
  display state, or a workflow-only draft value. Start with
  [Tasks and Scheduling](domains/tasks-and-scheduling.md).
- **Read:** [Frontend Architecture](architecture/frontend.md),
  [Repository Architecture](architecture/repositories.md), and
  [Persistence Architecture](architecture/persistence.md).
- **Layers involved:** Domain model and inputs, repository contract, REST DTO
  mapping and backend storage, SQLite schema/row mapping, legacy UI adapter, then
  the owning workflow and presentation.
- **Typical directories:** `taskmanager-frontend/src/domain/`, `repositories/`,
  `hooks/`, `components/`, `src/main/java/`, and the applicable schema location.
- **Tests:** Shared task repository contract, REST mapper/adapter tests, SQLite
  migration and repository tests, backend controller tests, workflow/UI tests, and
  null/omission regression coverage when the field is nullable.
- **Relevant ADRs:** [Repository Boundary](adr/adr-0009-repository-boundary.md),
  [Canonical Domain IDs](adr/adr-0012-canonical-domain-ids.md), and the
  [Change Impact Guide](reference/change-impact-guide.md).

### Adding A New Repository Method

- **Begin with:** Establish the domain behavior the method must guarantee; do not
  start from SQL or an existing REST endpoint.
- **Read:** [Repository Architecture](architecture/repositories.md), the affected
  domain guide, and [Testing](development/testing.md).
- **Layers involved:** Public repository interface, shared contract suite, REST
  adapter and transport/mappers, SQLite implementation and transaction behavior,
  then the workflow that consumes the method.
- **Typical directories:** `taskmanager-frontend/src/repositories/contracts.ts`,
  `repositories/contracts/`, `repositories/api/`, and `repositories/sqlite/`.
- **Tests:** Add one shared behavioral assertion when both adapters guarantee it;
  keep transport limitations and SQLite-only constraints in adapter-specific tests.
- **Relevant ADRs:** [Repository Boundary](adr/adr-0009-repository-boundary.md) and,
  for multi-write behavior, [SQLite Lifecycle](adr/adr-0010-sqlite-lifecycle.md).

### Changing Recurrence Behavior

- **Begin with:** Identify whether the change affects interval calculation,
  persistence ownership, editing, or recurring completion. Read
  [Recurrence](domains/recurrence.md) first.
- **Read:** [Tasks and Scheduling](domains/tasks-and-scheduling.md),
  [SQLite Architecture](architecture/sqlite.md), and the REST section of
  [Backend Architecture](architecture/backend.md).
- **Layers involved:** Recurrence utilities, create/edit workflows, App-level
  replacement orchestration, recurrence repository, REST controller, and SQLite
  child relationship/hydration.
- **Typical directories:** `src/utils/taskRecurrence.ts`, `src/hooks/`, `App.tsx`,
  both recurrence repositories, `SQLiteTaskRepository.ts`, and
  `TaskController.java`.
- **Tests:** Recurrence calculation tests, workflow/App replacement tests, shared
  recurrence contract tests, SQLite relationship/N+1/cascade tests, and backend
  controller validation tests.
- **Relevant ADRs:** [Recurring Task Replacement](adr/adr-0007-recurring-task-replacement.md)
  and [Recurrence Ownership](adr/adr-0013-recurrence-ownership.md).

### Adding A Mobile-Specific Feature

- **Begin with:** Define whether the behavior is presentation-only, a workflow, or
  a platform capability. Read [Mobile and iOS Architecture](architecture/mobile-ios.md)
  before changing shell, pager, focus, scroll, or viewport behavior.
- **Read:** [Frontend Architecture](architecture/frontend.md),
  [iOS Development](development/ios-development.md), and
  [Change Impact](reference/change-impact-guide.md).
- **Layers involved:** Component presentation, owning workflow hook or App
  coordination, shared mobile shell CSS, and a platform abstraction when native
  behavior is required.
- **Typical directories:** `src/components/`, `src/hooks/`, `App.tsx`, `App.css`,
  `src/utils/mobileFocusAssist.ts`, and only when necessary `ios/` or a driver
  boundary.
- **Tests:** Focused component/hook tests, App pager/focus regression tests, build,
  and real iOS validation for keyboard, viewport, safe-area, or plugin behavior.
- **Relevant ADRs:** [Mobile Edit Row](adr/adr-0004-mobile-edit-row.md),
  [iOS Focus Guard](adr/adr-0005-ios-focus-guard.md), and when persistence is
  involved [Runtime Provider Selection](adr/adr-0011-runtime-provider-selection.md).

### Adding A New REST Endpoint

- **Begin with:** Decide whether the endpoint supports an existing repository
  capability or requires a new domain contract. Read
  [Backend Architecture](architecture/backend.md) and [API Reference](reference/api.md).
- **Read:** [Repository Architecture](architecture/repositories.md) when frontend
  code will consume the endpoint, plus the affected domain guide.
- **Layers involved:** Spring controller validation and repository access, JPA
  entity/schema when needed, REST transport, DTO mapper, API repository, and the
  shared contract only if behavior is provider-independent.
- **Typical directories:** `src/main/java/com/example/taskmanager/`, `src/test/`,
  `taskmanager-frontend/src/api/`, and `repositories/api/`.
- **Tests:** Backend controller/repository tests, REST transport and mapper tests,
  API repository contract coverage, and equivalent SQLite behavior if the public
  repository contract changes.
- **Relevant ADRs:** [No Backend Service Layer](adr/adr-0008-no-backend-service-layer.md)
  and [Repository Boundary](adr/adr-0009-repository-boundary.md).

### Extending SQLite Persistence

- **Begin with:** Determine whether the change is repository behavior, a schema
  migration, a relationship hydration change, or native driver lifecycle work.
  Start with [SQLite Architecture](architecture/sqlite.md).
- **Read:** [Persistence Architecture](architecture/persistence.md),
  [Repository Architecture](architecture/repositories.md), and
  [Synchronization Boundary](architecture/synchronization.md) so local storage is
  not mistaken for sync.
- **Layers involved:** Forward-only migration, row mapper, repository SQL,
  transaction context, composition/service lifecycle, and native driver only when
  the abstraction itself changes.
- **Typical directories:** `repositories/sqlite/migrations.ts`, `mappers.ts`,
  `SQLite*Repository.ts`, `SQLiteDatabaseService.ts`, and `sqlite/__tests__/`.
- **Tests:** Fresh and upgrade migration tests, shared contract suite, SQLite
  constraints/rollback/hydration/query-bound tests, composition tests, and native
  smoke validation for service or driver changes.
- **Relevant ADRs:** [SQLite Lifecycle](adr/adr-0010-sqlite-lifecycle.md),
  [Runtime Provider Selection](adr/adr-0011-runtime-provider-selection.md), and
  [Recurrence Ownership](adr/adr-0013-recurrence-ownership.md) when applicable.

## What To Ignore

- `target/`, `taskmanager-frontend/build/`, and synced iOS web assets are generated.
- `taskmanager-frontend/ios/App/CapApp-SPM/README.md` is generated plugin metadata.
- `docs/history/` is context, not current implementation authority.
- IDE metadata and local assistant histories are not runtime architecture.

## Related Documents

- [Architecture Overview](architecture/overview.md)
- [Development Workflow](development/workflow.md)
- [Testing Guide](development/testing.md)
- [Glossary](reference/glossary.md)
