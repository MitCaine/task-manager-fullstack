# Persistence Architecture

| Field | Value |
| --- | --- |
| Status | Canonical |
| Audience | Persistence, backend, and mobile contributors |
| Owner | Task Manager maintainers |
| Last verified | 2026-07-18 |

## Purpose

Task Manager has two independent persistence runtimes behind one frontend
repository contract: Spring REST backed by MySQL and native SQLite on iOS.

## Scope

This guide explains authority, selection, schema evolution, identity, and the
absence of synchronization. Detailed SQLite mechanics are documented separately.

## Architectural Invariants

- Exactly one complete persistence composition is active in an App runtime.
- REST/MySQL remains the default.
- SQLite is opt-in and supported only on native iOS.
- No fallback occurs after SQLite initialization begins and fails.
- No data is copied, synchronized, or dual-written between stores.
- Each store evolves through its own schema process.

## Persistence Modes

| Mode | Selection | Storage | Identity |
| --- | --- | --- | --- |
| REST | Default; always used on web | MySQL through Spring Boot | Numeric backend IDs mapped to strings |
| SQLite | Flag `REACT_APP_ENABLE_SQLITE_PERSISTENCE=true` plus native iOS | App-local SQLite database `task_manager_sqlite` | Generated text IDs |

The same user action can therefore affect different datasets depending on the
selected runtime. This is expected in the current migration stage.

## MySQL Schema Evolution

`SQL Files/databasemodel.sql` is the baseline schema. Incremental scripts under
`src/main/resources/schema-updates/` are applied manually. Hibernate uses
`ddl-auto=none`; application startup does not create or migrate MySQL tables.

There is no migration history table or automated ordering. Operators must know
which scripts have been applied.

## SQLite Schema Evolution

SQLite uses forward-only migrations and `PRAGMA user_version`. Initialization
opens the driver, applies pragmas, and runs every migration with a version above
the current value. Production runtime never performs a destructive reset.

## Relationships

Both stores represent tasks, projects, tags, subtasks, notes, reminders,
attachments, and recurrence, but their physical ownership differs where adapters
need to normalize the domain:

- REST stores numeric foreign-key-like fields and a task-side recurrence rule ID.
- SQLite uses foreign keys, cascade rules, a task-tag join table, and
  `recurrence_rules.task_id UNIQUE`.
- SQLite derives `Task.recurrenceRuleId` during hydration; it does not duplicate
  recurrence ownership on `tasks`.

## Transactions

Backend repository calls execute within Spring/JPA operation behavior, but the
frontend REST workflow has no transaction spanning multiple HTTP requests.

SQLite supports explicit queued transactions. A caller can pass one transaction
context through multiple repositories. Repositories use the supplied driver and
must not open a nested service transaction.

## Backup And Export

No user-facing backup, export, import, or restore workflow exists. Native SQLite
persists across service close/reopen and normal application relaunch, subject to
iOS app-container lifetime. App deletion or data clearing removes local storage.

## Code Map

- MySQL baseline: `SQL Files/databasemodel.sql`
- MySQL updates: `src/main/resources/schema-updates/`
- Backend config: `src/main/resources/application.properties`
- SQLite migrations: `taskmanager-frontend/src/repositories/sqlite/migrations.ts`
- Runtime selector: `taskmanager-frontend/src/repositories/runtimeRepositories.ts`

## Testing

H2 backs backend automated tests. SQL.js backs deterministic SQLite tests. The
native smoke harness verifies persistence across close/reopen and cascade behavior
against the real iOS Capacitor plugin.

## Known Limitations

- There is no declared source of truth across REST and SQLite datasets because
  they are never active together.
- MySQL migration bookkeeping is manual.
- SQLite schema version 1 is the only current migration.
- No backup/export or encrypted-database policy exists.

## Related ADRs

- [ADR-0010: SQLite Lifecycle](../adr/adr-0010-sqlite-lifecycle.md)
- [ADR-0011: Runtime Provider Selection](../adr/adr-0011-runtime-provider-selection.md)

## Related Documents

- [Repository Architecture](repositories.md)
- [SQLite Architecture](sqlite.md)
- [Synchronization Boundary](synchronization.md)
