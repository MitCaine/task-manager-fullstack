# SQLite Architecture

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | SQLite, repository, and native iOS contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

This guide defines the local SQLite schema, service lifecycle, transaction model,
driver boundary, hydration strategy, and native validation path.

## Scope

SQLite is a complete but opt-in persistence runtime. This guide does not claim
data synchronization, REST migration, or unconditional native activation.

## Architectural Invariants

- App entities use text primary keys.
- Status IDs are text and constrained to `not_started`, `in_progress`, and
  `completed`.
- Foreign keys are enabled before migrations or repository work.
- `recurrence_rules.task_id UNIQUE` is the only recurrence ownership relationship.
- Migrations are forward-only and versioned with `PRAGMA user_version`.
- Explicit transactions are serialized by the database service.
- Repository calls reuse `options.tx.db` when supplied.
- The service owns open, migration, transaction, and close lifecycle; the factory
  only composes repositories.

## Schema

Migration version 1 creates:

| Table | Key relationships |
| --- | --- |
| `statuses` | Canonical seeded status IDs |
| `projects` | Referenced by tasks; project deletion sets task project to null |
| `tags` | Joined to tasks through `task_tags` |
| `tasks` | References status and optional project |
| `task_tags` | Composite task/tag key; cascades from either parent |
| `subtasks` | Required parent task and status; cascades with task |
| `notes` | Required parent task; cascades with task |
| `reminders` | Required parent task; cascades with task |
| `attachments` | Required parent task; cascades with task |
| `recurrence_rules` | One optional rule per task; cascades with task |

Baseline indexes support task schedule/status/project queries and child lookups.
Date-time values are serialized as text. Task and recurrence end times are
constrained to be later than their start times when both are present.

## Initialization

`SQLiteDatabaseService.initialize()` deduplicates concurrent initialization. A
failed initialization clears the cached promise so a later call can retry.

```text
driver.open
  -> foreign_keys = ON
  -> journal_mode = WAL
  -> synchronous = NORMAL
  -> busy_timeout = 5000
  -> run forward migrations
```

Pragmas and migration statements inside an explicit migration transaction are
executed with Capacitor plugin-managed transactions disabled. This prevents WAL
and nested-transaction failures on iOS.

## Transactions

`service.transaction(work)` places every transaction in a promise queue. The
queued runner initializes the database, begins one driver transaction, passes
`{db, inTransaction: true}`, and commits or rolls back. There is no service-wide
active transaction that unrelated work can join.

Repositories do not call `service.transaction()` merely because no context was
supplied. Callers own multi-repository atomicity.

## Task Hydration

Task list hydration uses bounded queries:

1. one task query;
2. one batched task-tag query;
3. one batched task-recurrence relationship query;
4. in-memory grouping and final domain assembly.

Raw row mapping, relationship grouping, and final task construction remain
separate concepts in `mappers.ts`.

## Native Driver Lifecycle

`CapacitorSQLiteDriver` retrieves an existing connection when possible and creates
one otherwise. It checks consistency after obtaining the connection, opens only
when needed, normalizes missing query values to an empty array, delegates explicit
transaction methods, and closes both the database and connection-manager record.
A later service/driver instance can reopen the same named database.

## Native Smoke Harness

`runNativeSQLiteSmokeTest()` is explicit and does not use `RepositoryContext`.
It creates a complete object graph, verifies relationships and pragmas, closes and
reopens the database, verifies persistence, deletes the task, verifies cascades,
cleans up catalog rows, and closes the connection.

The isolated database is `task_manager_sqlite_smoke`. The function returns a
structured stage result and skips web execution.

## Code Map

- Service: `SQLiteDatabaseService.ts`
- Driver contract: `types.ts`
- Native driver: `CapacitorSQLiteDriver.ts`
- Schema and runner: `migrations.ts`
- Factory: `createSQLiteRepositories.ts`
- Repositories and mapping: `SQLite*Repository.ts`, `mappers.ts`
- SQL.js driver: `testing/SqlJsTestDriver.ts`
- Native harness: `nativeSmokeTest.ts`

## Testing

Tests cover initialization, idempotent migration, status seeds, constraints,
cascades, rollback, transaction serialization, patch semantics, relationship
hydration, N+1 prevention, composition, driver delegation, failure retry, and
close/reopen behavior.

## Known Limitations

- Only iOS is accepted by runtime selection.
- SQLite has no encryption, export, or sync behavior.
- WAL is configured and native smoke-verified on iOS; other platforms are not
  qualified.
- Schema changes require a new migration; version 1 must remain immutable.

## Related ADRs

- [ADR-0010: SQLite Lifecycle](../adr/adr-0010-sqlite-lifecycle.md)
- [ADR-0013: Recurrence Ownership](../adr/adr-0013-recurrence-ownership.md)

## Related Documents

- [Persistence Architecture](persistence.md)
- [Mobile and iOS Architecture](mobile-ios.md)
- [iOS Development](../development/ios-development.md)
