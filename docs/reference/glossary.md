# Architecture Glossary

| Field | Value |
| --- | --- |
| Status | Canonical reference |
| Audience | New and returning contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This glossary defines vocabulary used by the canonical documentation. Definitions
are intentionally short; linked guides remain the source for architecture and
behavior.

## Terms

### Canonical Status ID

One of the domain status strings `not_started`, `in_progress`, or `completed`.
REST numeric status values and legacy UI values are adapter details. See
[Repository Architecture](../architecture/repositories.md).

### Canonical String ID

The `string` identity used by frontend domain models and repository contracts for
every entity, regardless of whether storage uses a number or generated text. See
[ADR-0012](../adr/adr-0012-canonical-domain-ids.md).

### Child Resource

A subtask, note, reminder, or attachment owned by one parent task. See
[Child Resources](../domains/child-resources.md).

### Composition Root

The place where application-wide dependencies are assembled. `index.tsx` mounts
the provider and App; runtime repository composition is delegated to the provider
boundary. See [Architecture Overview](../architecture/overview.md).

### Domain Boundary

The point where application meaning is separated from transport, database, or
legacy UI representation. Repository interfaces and domain models form the
frontend persistence domain boundary.

### Domain Model

A persistence-independent entity or input defined in `src/domain/models.ts`, using
canonical IDs and field names. It is distinct from a REST DTO, SQLite row, or
legacy UI model.

### Hydration

Assembling a complete domain object from scalar storage rows plus relationships.
SQLite task hydration batches tags and recurrence IDs before constructing tasks.
See [SQLite Architecture](../architecture/sqlite.md).

### Legacy Adapter

Compatibility code that maps domain models and IDs to the older REST-shaped,
numeric model still used by App UI state. See
[Why This Exists](why-this-exists.md#why-legacy-adapters-exist).

### Legacy Numeric ID

A numeric identifier expected by the existing UI. Numeric domain IDs map directly;
nonnumeric SQLite IDs receive stable in-memory negative aliases. It is not domain
identity and is not persisted as a cross-provider key.

### Native Smoke Harness

The explicit development-only flow that validates the real Capacitor SQLite
driver, repositories, pragmas, migrations, persistence across reopen, cascades,
and cleanup on iOS. See [iOS Development](../development/ios-development.md).

### Persistence Provider

The selected complete persistence implementation for one App runtime: REST or
SQLite. It is not an individual repository and does not imply synchronization.
See [Persistence Architecture](../architecture/persistence.md).

### Platform Abstraction

A boundary that isolates native or platform-specific behavior from features. In
this project, platform detection belongs in runtime composition and native driver
logic, not individual components or repositories. See
[Mobile and iOS Architecture](../architecture/mobile-ios.md).

### Recurrence Ownership

The single relationship that determines which recurrence rule belongs to a task.
In SQLite it is `recurrence_rules.task_id UNIQUE`; task recurrence identity is
derived during hydration. See [Recurrence](../domains/recurrence.md).

### Repository Contract

A persistence-independent interface describing operations and domain-shaped
results for one resource. Shared contract tests define behavior guaranteed by both
REST and SQLite. See [Repository Architecture](../architecture/repositories.md).

### Repository Factory

A function that constructs a complete repository aggregate. The REST factory owns
no lifecycle; the SQLite factory receives a caller-owned database service.

### `RepositoryProvider`

The React context boundary that exposes repositories only when the selected
composition is ready and closes provider-owned runtime selections on unmount. It
does not close explicitly injected repositories.

### REST Adapter

A repository implementation that translates domain inputs/results to backend DTOs
and delegates HTTP transport to `api/tasks.ts`. See
[Repository Architecture](../architecture/repositories.md#rest-adapter).

### REST DTO

The backend-shaped request or response representation, including numeric IDs and
historical names such as `taskID`. DTOs remain behind REST mappers.

### Row Mapper

A focused function that converts raw SQLite query rows into domain values or
relationship groupings. Row mapping stays separate from repository orchestration.

### Runtime Repository Set

The complete `Repositories` aggregate selected for one runtime. Every key comes
from REST or every key comes from SQLite; sets are never mixed. See
[ADR-0011](../adr/adr-0011-runtime-provider-selection.md).

### SQLite Adapter

A repository implementation that uses the shared SQLite service, SQL row mappers,
and an optional transaction context while returning domain models. See
[SQLite Architecture](../architecture/sqlite.md).

### Transaction Context

An explicit object containing the SQLite driver for work already inside a service
transaction. Repository methods reuse `options.tx.db` rather than starting a
nested transaction.

### Transaction Queue

The promise queue in `SQLiteDatabaseService` that serializes independent explicit
transactions so unrelated work cannot accidentally overlap or share transaction
state.

### Workflow Hook

A React hook that owns a bounded stateful user workflow, such as task creation,
editing, or catalog management. It may coordinate repository calls but does not
implement persistence. See [Frontend Architecture](../architecture/frontend.md).

## Related Documents

- [Repository Tour](../repository-tour.md)
- [Architecture Overview](../architecture/overview.md)
- [Why This Exists](why-this-exists.md)
